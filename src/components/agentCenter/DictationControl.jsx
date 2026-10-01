import {useEffect,useRef} from 'react';

export default function DictationControl({value,onChange,disabled=false,label='your message'}) {
  const host=useRef(null), mount=useRef(null), latest=useRef({value,onChange});
  latest.current={value,onChange};
  useEffect(()=>{
    const api=/** @type {any} */ (window).HubDictation;
    if(!api||!host.current)return;
    const control=api.mount(host.current,{label,
      getText:()=>latest.current.value,
      setText:text=>{latest.current={...latest.current,value:text};latest.current.onChange(text);}
    });
    mount.current=control;
    return ()=>{control.dispose();mount.current=null;};
  },[label]);
  useEffect(()=>{mount.current?.setDisabled(disabled);},[disabled]);
  return <div ref={host}/>;
}
