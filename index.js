const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { google } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
console.log(serviceAccount.private_key);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

async function getAccessToken() {
  const jwtClient = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    SCOPES,
    null
  );
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

async function sendPushNotification({ token, title, body, route }) {
  try {
    console.log(`🚀 Sending push to token: ${token}`);
    const accessToken = await getAccessToken();
    console.log(`✅ Got access token`);

    const projectId = serviceAccount.project_id;

    const message = {
      message: {
        token,
        notification: { title, body },
        data: { route: route || '' },
      },
    };

    console.log(`📦 Message payload: ${JSON.stringify(message)}`);

    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      message,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ FCM response:', response.data);
  } catch (err) {
    console.error('❌ Error inside sendPushNotification:', err.response?.data || err.message);
    throw err; // rethrow so the route knows it failed
  }
}


app.post('/sendNotification', async (req, res) => {
  try {
    const { token, title, body, route } = req.body;

    if (!token || !title || !body) {
      return res.status(400).send('Missing required fields');
    }

    await sendPushNotification({ token, title, body, route });

    return res.status(200).send('Push notification sent');
  } catch (err) {
    console.error('❌ Error sending notification:', err);
    return res.status(500).send('Server error');
  }
});


app.get('/', (_, res) => {
  res.send('🚀 Push Notification API is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Listening on port ${PORT}`));
