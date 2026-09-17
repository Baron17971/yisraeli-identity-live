import QRCode from 'qrcode';
export default async function handler(req,res){
  try{
    const text=String(req.query?.text||'').slice(0,1000);
    if(!text)return res.status(400).send('missing text');
    const png=await QRCode.toBuffer(text,{width:512,margin:2,errorCorrectionLevel:'M'});
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=3600');
    return res.status(200).send(png);
  }catch(e){return res.status(500).send('qr error')}
}
