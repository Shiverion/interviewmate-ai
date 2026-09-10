import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";
const env = await initializeTestEnvironment({
  projectId: "demo-interviewmate",
  firestore: {
    host: "127.0.0.1",
    port: 8085,
    rules: await readFile("firestore.rules", "utf8"),
  },
  storage: {
    host: "127.0.0.1",
    port: 9195,
    rules: await readFile("storage.rules", "utf8"),
  },
});
let checks = 0;
async function pass(name, operation, allowed = true) {
  await (allowed ? assertSucceeds(operation) : assertFails(operation));
  checks++;
  console.log(`PASS ${name}`);
}
const account = (uid, email = `${uid}@example.test`, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified });
const a = account("recruiter-a"),
  b = account("recruiter-b"),
  candidate = account("candidate"),
  admin = account("admin", "miqbal.izzulhaq@gmail.com"),
  impostor = account("impostor", "miqbal.izzulhaq@gmail.com", false),
  anonymous = env.unauthenticatedContext();
const session = {
  recruiter_id: "recruiter-a",
  candidate_email: "candidate@example.test",
  status: "active",
  valid_from: Timestamp.fromMillis(Date.now() - 10000),
  expires_at: Timestamp.fromMillis(Date.now() + 3600000),
};
const item = (ctx, name = "owned") =>
  doc(ctx.firestore(), "interview_sessions", name);
try {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(item(ctx), session);
    await setDoc(item(ctx, "legacy"), { status: "completed" });
    await setDoc(item(ctx, "revoked"), { ...session, status: "revoked" });
    await setDoc(item(ctx, "expired"), {
      ...session,
      expires_at: Timestamp.fromMillis(Date.now() - 1),
    });
    await setDoc(doc(ctx.firestore(), "interview_templates", "template"), {
      recruiter_id: "recruiter-a",
    });
    await setDoc(doc(ctx.firestore(), "candidate_reports", "report"), {
      recruiter_id: "recruiter-a",
      private: "synthetic",
    });
  });
  await pass("owner reads own interview", getDoc(item(a)));
  await pass(
    "another recruiter cannot open a known interview ID",
    getDoc(item(b)),
    false
  );
  await pass("anonymous denied", getDoc(item(anonymous)), false);
  await pass("verified administrator reads any interview", getDoc(item(admin)));
  await pass(
    "administrator can inspect legacy ownerless data",
    getDoc(item(admin, "legacy"))
  );
  await pass(
    "unverified administrator email is not privilege",
    getDoc(item(impostor)),
    false
  );
  await pass(
    "owner query allowed",
    getDocs(
      query(
        collection(a.firestore(), "interview_sessions"),
        where("recruiter_id", "==", "recruiter-a")
      )
    )
  );
  await pass(
    "unfiltered non-admin query denied",
    getDocs(collection(a.firestore(), "interview_sessions")),
    false
  );
  await pass(
    "cross-owner query denied",
    getDocs(
      query(
        collection(b.firestore(), "interview_sessions"),
        where("recruiter_id", "==", "recruiter-a")
      )
    ),
    false
  );
  await pass(
    "admin list allowed",
    getDocs(collection(admin.firestore(), "interview_sessions"))
  );
  await pass(
    "cannot create for another recruiter",
    setDoc(item(b, "forged"), session),
    false
  );
  await pass(
    "own creation allowed",
    setDoc(item(b, "new"), { ...session, recruiter_id: "recruiter-b" })
  );
  await pass(
    "ownership cannot be reassigned",
    updateDoc(item(a), { recruiter_id: "recruiter-b" }),
    false
  );
  await pass(
    "admin cannot silently reassign owner",
    updateDoc(item(admin), { recruiter_id: "admin" }),
    false
  );
  await pass(
    "invited verified candidate can get session",
    getDoc(item(candidate))
  );
  await pass(
    "unverified candidate denied",
    getDoc(item(account("candidate2", "candidate@example.test", false))),
    false
  );
  await pass(
    "candidate cannot list recruiting data",
    getDocs(collection(candidate.firestore(), "interview_sessions")),
    false
  );
  await pass(
    "revoked candidate denied",
    getDoc(item(candidate, "revoked")),
    false
  );
  await pass(
    "expired candidate denied",
    getDoc(item(candidate, "expired")),
    false
  );
  await pass(
    "candidate can save workspace",
    updateDoc(item(candidate), { code_workspace: { text: "synthetic answer" } })
  );
  await pass(
    "candidate cannot extend deadline",
    updateDoc(item(candidate), {
      expires_at: Timestamp.fromMillis(Date.now() + 7200000),
    }),
    false
  );
  await pass(
    "candidate cannot write their own score",
    updateDoc(item(candidate), { evaluation: { overallScore: 100 } }),
    false
  );
  await pass(
    "candidate can submit answers",
    updateDoc(item(candidate), { status: "completed", final_transcript: [] })
  );
  await pass(
    "candidate cannot reopen completed interview",
    updateDoc(item(candidate), { status: "active" }),
    false
  );
  await pass(
    "owner can save assessment",
    updateDoc(item(a), {
      status: "evaluated",
      evaluation: { overallScore: null },
    })
  );
  await pass(
    "candidate cannot rewrite evaluated answers",
    updateDoc(item(candidate), { final_transcript: ["forged"] }),
    false
  );
  for (const path of [
    "interview_templates/template",
    "candidate_reports/report",
  ]) {
    await pass(`${path} owner allowed`, getDoc(doc(a.firestore(), path)));
    await pass(
      `${path} other recruiter denied`,
      getDoc(doc(b.firestore(), path)),
      false
    );
    await pass(`${path} admin allowed`, getDoc(doc(admin.firestore(), path)));
    await pass(
      `${path} candidate denied`,
      getDoc(doc(candidate.firestore(), path)),
      false
    );
  }
  const file = (ctx) => ref(ctx.storage(), "resumes/recruiter-a/owned/cv.pdf");
  await pass(
    "owner PDF upload allowed",
    uploadBytes(file(a), new Uint8Array([37, 80, 68, 70]), {
      contentType: "application/pdf",
    })
  );
  await pass("owner PDF read allowed", getBytes(file(a)));
  await pass("other recruiter PDF read denied", getBytes(file(b)), false);
  await pass("anonymous PDF read denied", getBytes(file(anonymous)), false);
  await pass("admin PDF read allowed", getBytes(file(admin)));
  await pass(
    "invited candidate can read own private CV",
    getBytes(file(candidate))
  );
  await pass(
    "unverified candidate cannot read CV",
    getBytes(file(account("unverified-cv", "candidate@example.test", false))),
    false
  );
  await pass(
    "cannot upload into another owner path",
    uploadBytes(file(b), new Uint8Array([1]), {
      contentType: "application/pdf",
    }),
    false
  );
  await pass(
    "anonymous audio upload denied",
    uploadBytes(
      ref(anonymous.storage(), "audio/anything"),
      new Uint8Array([1])
    ),
    false
  );
  await pass("owner PDF delete allowed", deleteObject(file(a)));
  console.log(`Access rules: ${checks} checks passed.`);
} finally {
  await env.cleanup();
}
