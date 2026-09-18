import { GoogleAuth } from 'google-auth-library';
async function test() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  console.log("Project ID from ADC:", projectId);
  
  if (client.credentials && client.credentials.client_email) {
    console.log("Service Account Email:", client.credentials.client_email);
  } else {
    console.log("Using compute credentials");
  }
}
test().catch(console.error);
