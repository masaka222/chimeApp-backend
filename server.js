const express = require('express');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const compression = require('compression');
const bodyParser = require('body-parser');
const cors = (require('cors'));
//const keys = require('./config/keys');

const app = express();

app.use(bodyParser.json());
app.use(compression());  // compress all responses
app.use(cors());

// Store created meetings in a map so attendees can join by meeting title
const meetingTable = {
    
};

//AWS.config.credentials = new AWS.Credentials(keys.accessKeyId, keys.secretAccessKey, null);
const chime = new AWS.Chime({ region: 'us-east-1' });
//chime.endpoint = new AWS.Endpoint(process.env.ENDPOINT || 'https://service.chime.aws.amazon.com');
chime.endpoint = new AWS.Endpoint('https://service.chime.aws.amazon.com');

app.get('/', (req, res) => {
    res.send(req.originalUrl);
    //const requestUrl = url.parse(req.url, true);

    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    //console.log (req.originalUrl);
});

app.post('/join', async (req, res) => {
    try {
        if (!meetingTable[req.body.title]){
            meetingTable[req.body.title] = await chime.createMeeting({
                ClientRequestToken: uuidv4(),
                MediaRegion: req.body.region,
                ExternalMeetingId: req.body.title.substring(0, 64),
            }).promise();
        }
        // Fetch the meeting info
        const meeting = meetingTable[req.body.title];

        // Create new attendee for the meeting
        const attendee = await chime.createAttendee({
            MeetingId: meeting.Meeting.MeetingId,
            ExternalUserId: `${uuidv4().substring(0, 8)}#${req.body.name}`.substring(0, 64),
        }).promise()

        // Return the meeting and attendee responses. The client will use these
        // to join the meeting.
        res.json({
            JoinInfo: {
              Meeting: meeting,
              Attendee: attendee,
            }});
    } catch (err) {
        if(err.message = 'The meeting has ended'){
            meetingTable[req.body.title] = await chime.createMeeting({
                ClientRequestToken: uuidv4(),
                MediaRegion: req.body.region,
                ExternalMeetingId: req.body.title.substring(0, 64),
            }).promise();

            const meeting = meetingTable[req.body.title];
            const attendee = await chime.createAttendee({
                MeetingId: meeting.Meeting.MeetingId,
                ExternalUserId: `${uuidv4().substring(0, 8)}#${req.body.name}`.substring(0, 64),
            }).promise()

            res.json({
                JoinInfo: {
                  Meeting: meeting,
                  Attendee: attendee,
                }
            });

        } else {
            res.json({error: err.message});
        }
    }
});

/*
  ===================================================================
                        Web Socket (Socket.io)
  ===================================================================
*/
var server = require('http').createServer(app);
const io = require('socket.io')(server, {
    transports: ['websocket', 'polling']
});

io.on('connection', client =>{
    console.log('a user is connected');

    client.on('canspeak', canSpeak => {
        const privilege = {canSpeak}
        io.emit('connected', privilege);
        console.log('connected');
    });

    client.on('setFocusMode', canspeak => {
        io.emit('giveSilence', {
            canSpeak: !canspeak,
            canSendMessage: false
        });
        console.log('setFocusMode');
    })
});

PORT = process.env.PORT || 8000;
//app.listen(PORT);
server.listen(PORT);