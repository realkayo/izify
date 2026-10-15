/* Decode each built-in image once. CSS receives short URLs instead of repeated base64. */
(() => {
  const M=window.__izifyModules ||= {},urls=new Set();
  M.assetURL=name=>{
    const images=window.__izifyAssets.images,value=images?.[name];
    if(!value?.startsWith('data:'))return value||'';
    const match=/^data:([^;,]+);base64,([\s\S]+)$/.exec(value);if(!match)return value;
    const decoded=atob(match[2]),bytes=new Uint8Array(decoded.length);
    for(let i=0;i<bytes.length;i++)bytes[i]=decoded.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:match[1]}));urls.add(url);images[name]=url;return url;
  };
  M.releaseAssets=()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear();};
})();
