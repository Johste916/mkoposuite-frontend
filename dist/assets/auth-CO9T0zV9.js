const r=()=>{const e=localStorage.getItem("user");if(!e)return null;try{return JSON.parse(e).role}catch{return null}};export{r as g};
