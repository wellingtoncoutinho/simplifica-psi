async function listDatabases(projectId: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases`;
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Project: ${projectId}`);
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text.slice(0, 1000)}`);
  } catch (e) {
    console.error(`Error for ${projectId}:`, e);
  }
}

async function run() {
  await listDatabases('simpsifica');
}

run().then(() => process.exit(0));
