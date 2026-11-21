import { evaluarInvocacion } from '../lib/invocaciones';
self.onmessage=({data}:MessageEvent<Parameters<typeof evaluarInvocacion>>)=>{
  self.postMessage(evaluarInvocacion(...data));
};
