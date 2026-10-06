import * as React from 'react';

export type MotivoSinCamara = 'insegura'|'sin_lector'|'sin_camara'|'sin_permiso';

type Detector = {detect:(fuente:HTMLVideoElement) => Promise<{rawValue:string}[]>};
declare const BarcodeDetector:{new(opciones:{formats:string[]}):Detector};

const FORMATOS = ['ean_13', 'upc_a'];
const MS_ENTRE_LECTURAS = 250;

export function LectorDeCamara({onLeido, onSinCamara}:{
    onLeido:(texto:string) => void,
    onSinCamara:(motivo:MotivoSinCamara) => void,
}){
    const video = React.useRef<HTMLVideoElement>(null);
    const avisos = React.useRef({onLeido, onSinCamara});
    avisos.current = {onLeido, onSinCamara};

    React.useEffect(() => {
        if(!window.isSecureContext || navigator.mediaDevices == null){
            avisos.current.onSinCamara('insegura');
            return;
        }
        let detector:Detector;
        try{
            detector = new BarcodeDetector({formats:FORMATOS});
        }catch(_err){
            avisos.current.onSinCamara('sin_lector');
            return;
        }
        let stream:MediaStream|null = null;
        let intervalo:number|undefined;
        let cancelado = false;
        navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(async recibido => {
            const elemento = video.current;
            if(cancelado || elemento == null){
                recibido.getTracks().forEach(pista => pista.stop());
                return;
            }
            stream = recibido;
            elemento.srcObject = recibido;
            await elemento.play();
            intervalo = window.setInterval(() => {
                detector.detect(elemento).then(codigos => {
                    if(!cancelado){
                        codigos.forEach(codigo => avisos.current.onLeido(codigo.rawValue));
                    }
                }).catch(err => {
                    if(!cancelado && err?.name === 'NotSupportedError'){
                        avisos.current.onSinCamara('sin_lector');
                    }
                });
            }, MS_ENTRE_LECTURAS);
        }).catch(err => {
            if(!cancelado){
                avisos.current.onSinCamara(err?.name === 'NotAllowedError' ? 'sin_permiso' : 'sin_camara');
            }
        });
        return () => {
            cancelado = true;
            window.clearInterval(intervalo);
            stream?.getTracks().forEach(pista => pista.stop());
        };
    }, []);

    return <video
        ref={video}
        playsInline
        muted
        style={{display:'block', width:'100%', aspectRatio:'4 / 3', maxHeight:'55vh', objectFit:'cover', borderRadius:8, background:'#000'}}
    />;
}
