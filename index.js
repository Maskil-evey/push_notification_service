// const express = require('express');
// const bodyParser = require('body-parser');
// const admin = require('firebase-admin');
// const { JWT } = require('google-auth-library'); // Correct import
// const axios = require('axios');
// require('dotenv').config();

// const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
// console.log(serviceAccount.private_key);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const app = express();
// app.use(bodyParser.json());

// const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

// async function getAccessToken() {
//   try {
//     const jwtClient = new JWT({
//       email: serviceAccount.client_email,
//       key: serviceAccount.private_key,
//       scopes: SCOPES,
//     });
//     const tokens = await jwtClient.authorize();
//     console.log('✅ Access token retrieved');
//     return tokens.access_token;
//   } catch (err) {
//     console.error('❌ Error in getAccessToken:', err);
//     throw err;
//   }
// }

// async function sendPushNotification({ token, title, body, route }) {
//   try {
//     console.log(`🚀 Sending push to token: ${token}`);
//     const accessToken = await getAccessToken();
//     console.log(`✅ Got access token`);

//     const projectId = serviceAccount.project_id;

//     const message = {
//       message: {
//         token,
//         notification: { title, body },
//         data: { route: route || '' },
//       },
//     };

//     console.log(`📦 Message payload: ${JSON.stringify(message)}`);

//     const response = await axios.post(
//       `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
//       message,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     console.log('✅ FCM response:', response.data);
//   } catch (err) {
//     console.error('❌ Error inside sendPushNotification:', err.response?.data || err.message);
//     throw err;
//   }
// }

// app.post('/sendNotification', async (req, res) => {
//   try {
//     const { token, title, body, route } = req.body;

//     if (!token || !title || !body) {
//       return res.status(400).send('Missing required fields');
//     }

//     await sendPushNotification({ token, title, body, route });

//     return res.status(200).send('Push notification sent');
//   } catch (err) {
//     console.error('❌ Error sending notification:', err);
//     return res.status(500).send('Server error');
//   }
// });

// app.get('/', (_, res) => {
//   res.send('🚀 Push Notification API is running!');
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🌍 Listening on port ${PORT}`));
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(bodyParser.json());

const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

async function getAccessToken() {
  try {
    const jwtClient = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: SCOPES,
    });
    const tokens = await jwtClient.authorize();
    console.log('✅ Access token retrieved');
    return tokens.access_token;
  } catch (err) {
    console.error('❌ Error in getAccessToken:', err);
    throw err;
  }
}

async function sendPushNotification({ token, topic, notification, data }) {
  try {
    if (!token && !topic) {
      throw new Error('No valid FCM token or topic provided');
    }

    const accessToken = await getAccessToken();
    const projectId = serviceAccount.project_id;

    // Convert all data values to string
    const stringifiedData = {};
    Object.keys(data || {}).forEach((key) => {
      stringifiedData[key] = String(data[key]);
    });

    const message = {
      message: {
        notification,
        data: stringifiedData,
        ...(token ? { token } : {}),
        ...(topic ? { topic } : {}),
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const result = await response.json();
    if (!response.ok) throw result;

    console.log('✅ FCM response:', result);
  } catch (err) {
    console.error('❌ Error in sendPushNotification:', err);
    throw err;
  }
}

app.post('/sendNotification', async (req, res) => {
  try {
    const { token, topic, notification, data } = req.body;

    if ((!token && !topic) || !notification || !data || !data.chatId) {
      return res.status(400).send('Missing required fields');
    }

    await sendPushNotification({ token, topic, notification, data });
    res.status(200).send('Push notification sent');
  } catch (err) {
    console.error('❌ Error sending notification:', err);
    res.status(500).send('Server error');
  }
});

app.get('/', (_, res) => {
  res.send('🚀 Push Notification API is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Listening on port ${PORT}`));
