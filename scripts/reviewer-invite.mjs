import {randomBytes,randomUUID,createHash} from "node:crypto";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const dir=path.resolve(process.env.DEMO_STATE_DIR||".demo-state");await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,"reviewer-cookie-secret"),randomBytes(32).toString("hex"),{flag:"wx",mode:0o600}).catch(e=>{if(e.code!=="EEXIST")throw e;});
const file=path.join(dir,"reviewer-invites.json");let invites=[];try{invites=JSON.parse(await readFile(file,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
if(process.argv[2]==="revoke"){const grant=invites.find(i=>i.id===process.argv[3]);if(!grant)throw Error("Invitation ID not found");grant.revoked=true;}
else{const code=randomBytes(24).toString("base64url"),id=randomUUID();invites.push({id,label:process.argv[3]||"Sprint reviewer",codeHash:createHash("sha256").update(code).digest("hex"),expiresAt:Date.now()+7*86400000,revoked:false,dailyStarts:30,budgetUnits:500});await writeFile(path.join(dir,"reviewer-invitation.txt"),`Invitation ID: ${id}\nCode: ${code}\nExpires in 7 days. Redeem at /reviewer. Share privately.\n`,{mode:0o600});console.log("Private invitation saved to "+path.join(dir,"reviewer-invitation.txt"));}
await writeFile(file,JSON.stringify(invites,null,2),{mode:0o600});
