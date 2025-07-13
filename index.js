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
const axios = require('axios');
const e = require('express');
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

async function sendPushNotification({ registration_ids, notification, data }) {
  try {
    if (!registration_ids || registration_ids.length === 0) {
      throw new Error('No valid FCM tokens provided');
    }

    const accessToken = await getAccessToken();
    const projectId = serviceAccount.project_id;

    const message = {
      registration_ids,
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.image,
      },
      data,
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

    console.log('✅ FCM response:', response.data);
  } catch (err) {
    console.error('❌ Error in sendPushNotification:', err.response?.data || err.message);
    throw err;
  }
}

app.post('/sendNotification', async (req, res) => {
  try {
    const { registration_ids,  notification, data } = req.body;

    if (!registration_ids || !notification || !notification.title || !notification.body || !data || !data.chatId) {
      return res.status(400).send('Missing required fields');
    }

    await sendPushNotification({ registration_ids, notification, data });

    return res.status(200).send('Push notification sent');
  } catch (err) {
    console.error('❌ Error sending notification:', err);
    return res.status(500).send('Server error');
  }
});
app.post('/sendNotification', async (req, res) => {
  try {
    const { tokens, title, body, chatId, isGroup } = req.body;

    if (!tokens || !title || !body || !chatId) {
      return res.status(400).send('Missing required fields');
    }

    await sendPushNotification({ tokens, title, body, chatId, isGroup });

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