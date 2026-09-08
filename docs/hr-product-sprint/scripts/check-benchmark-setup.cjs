#!/usr/bin/env node
"use strict";
// Readiness only: never prints keys, calls a provider, or changes environment files.
require("@next/env").loadEnvConfig(process.cwd(), true, {info(){},error(){}});
require("ts-node").register({transpileOnly:true,compilerOptions:{module:"CommonJS",moduleResolution:"Node",resolveJsonModule:true}});
const {loadCases}=require("../../../src/lib/benchmark/dataset.ts");
const {profiles}=require("../../../src/lib/benchmark/providers.ts");
const {cases,datasetHash}=loadCases();
console.log(JSON.stringify({
  datasetHash,
  englishBase:cases.filter(c=>c.language==="en"&&c.kind==="base").length,
  englishVariants:cases.filter(c=>c.kind==="variant").length,
  indonesianAdaptations:cases.filter(c=>c.language==="id").length,
  providerSetup:profiles().map(p=>({provider:p.label,model:p.model,keyVariable:p.keyName,
    status:p.configured?"key_present_access_unverified":"key_missing"})),
  humanTasks:["Review references before model outputs","Check Indonesian meaning against paired English","Judge outputs without provider names"],
  note:"No network request made. Setup readiness is not a live model-quality result.",
},null,2));
