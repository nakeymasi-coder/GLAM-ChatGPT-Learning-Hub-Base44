import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
export default function HubPurchaseGate({children}) {
  const [state,setState]=useState("checking");
  useEffect(()=>{
    let active=true;
    base44.functions.invoke("hubAccess",{op:"check"}).then(response=>{
      const result=response?.data??response;
      if(active)setState(result?.active===true?"allowed":"denied");
    }).catch(()=>{if(active)setState("denied");});
    return ()=>{active=false;};
  },[]);
  if(state==="checking")return <main className="p-8 text-center" role="status">Checking your Hub access…</main>;
  if(state!=="allowed")return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-bold">Connect your Hub purchase</h1><p className="my-4">Open ChatGPT Mastery Hub from your store purchase library using the same email you used at checkout.</p><a className="underline" href="https://glamhustlehub.com/account">Open my purchase library</a><p className="mt-4">Need help? glamorousgrammyglowup@gmail.com</p></main>;
  return children;
}
