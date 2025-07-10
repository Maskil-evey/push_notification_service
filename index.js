const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { google } = require('google-auth-library');
const axios = require('axios');
const serviceAccount = require('./service-account.json');

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
  const accessToken = await getAccessToken();
  const projectId = serviceAccount.project_id;

  const message = {
    message: {
      token,
      notification: { title, body },
      data: { route: route || '' },
    },
  };

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

  console.log('✅ Notification sent:', response.data);
}

app.post('/sendNotification', async (req, res) => {
  try {
    const { toUserId, title, body, route } = req.body;

    if (!toUserId || !title || !body) {
      return res.status(400).send('Missing required fields');
    }

    const userDoc = await admin.firestore().collection('users').doc(toUserId).get();
    const token = userDoc.data()?.fcmToken;

    if (!token) return res.status(404).send('User has no FCM token');

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
