import { evaluarBalance } from '../../lib/balance-laboratorio';

self.onmessage = ({ data }: MessageEvent<Parameters<typeof evaluarBalance>>) => {
  try {
    self.postMessage({ informe: evaluarBalance(...data) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
