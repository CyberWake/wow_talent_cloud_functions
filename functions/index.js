const functions = require('firebase-functions');
const admin = require('firebase-admin');
const urlBuilder = require('build-url');
const request = require('request-promise');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const fcm = admin.messaging();
const notifDB = db.collection("notifications")
const fieldVal = admin.firestore.FieldValue;

exports.sendLike = functions.firestore
.document('/videoLikes/{userUID}/likedVideos/{videoID}')
.onCreate(async (snap,context) => {
    const userUID = context.params.userUID;
    const videoID = context.params.videoID;
    const video = await db.collection('videos').doc(videoID).get();
    const ownerUID = video.data()['uploaderUid'];
    const owner = await db.collection('WowUsers').doc(ownerUID).get();
    const ownerToken = owner.data()['fcmToken'];
    const user = await db.collection('WowUsers').doc(userUID).get();
    const senderToken = user.data()['fcmToken'];
    if(senderToken !== ownerToken){
        notifDB.doc(ownerUID).collection('notifs').add({
            "from":userUID,
            "type":"like",
            "videoID":videoID,
            "timestamp":fieldVal.serverTimestamp(),
            "read":false
        })
        const payload = {
            notification: {
                title: "LIKE",
                body: `${user.data()['username']} liked your video`,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            data:{
                type:"like"
            }
        };
        return fcm.sendToDevice(ownerToken,payload);}
    else{
        return;
    }
});

exports.delLikeNotif = functions.firestore
.document("/videoLikes/{userUID}/likedVideos/{videoID}")
.onDelete(async (snap,context) => {
    const userUID = context.params.userUID;
    const videoID = context.params.videoID;
    const video = await db.collection('videos').doc(videoID).get();
    const ownerUID = video.data()['uploaderUid'];
    if(userUID!==ownerUID){
        query = notifDB.doc(ownerUID).collection("notifs");
        query = query.where("videoID","==",videoID);
        query = query.where("from","==",userUID);
        query = query.where("type","==","like").get().then((querySnap)=>{
            return querySnap.forEach(element => {
                element.ref.delete();
            });
        });
    }
})


exports.sendCommentNotif = functions.firestore
.document("/videoComments/{videoID}/{videoID1}/{timestamp}")
.onCreate(async (snap,context) => {
    const videoID = context.params.videoID;
    const videoID1 = context.params.videoID1;
    const timestamp = context.params.timestamp;

    const userID = snap.data()['userUID'];
    const video = await db.collection('videos').doc(videoID).get();
    const ownerUID = video.data()['uploaderUid'];
    const owner = await db.collection('WowUsers').doc(ownerUID).get();
    const ownerToken = owner.data()['fcmToken'];
    const user = await db.collection('WowUsers').doc(userID).get();
    const senderToken = user.data()['fcmToken'];
    if(senderToken!==ownerToken){
        notifDB.doc(ownerUID).collection("notifs").add({
            "from":userID,
            "type":"comment",
            "videoID":videoID,
            "timestamp":fieldVal.serverTimestamp(),
            "read":false
        })
        const payload = {
            notification: {
                title: "COMMENT",
                body:`${user.data()['username']} commented on your video`,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            data:{
                type:"comment",
                videoID:videoID
            }
        };
    return fcm.sendToDevice(ownerToken,payload);}
    else{
        return;
    }
});

exports.delCommentNotif = functions.firestore
.document("/videoComments/{videoID}/{videoID1}/{timestamp}")
.onDelete(async (snap,context) => {
    const videoID = context.params.videoID;
    const userID = snap.data()['userUID'];
    const video = await db.collection('videos').doc(videoID).get();
    const ownerUID = video.data()['uploaderUid'];

    if(userID!==ownerUID){
        query = notifDB.doc(ownerUID).collection("notifs");
        query = query.where("videoID","==",videoID);
        query = query.where("from","==",userID);
        query = query.where("type","==","comment").get().then((querySnap)=>{
            return querySnap.forEach(element => {
                element.ref.delete();
            });
        });
    }

})

exports.sendMsgNotif = functions.firestore
.document('/allChats/{concatID}/{concatId}/{timestamp}')
.onCreate( async (snap,context)=>{
    const recieverId = snap.data()['reciever'];
    const concatID = context.params.concatID;
    const senderID = concatID.replace(recieverId,"");
    console.log(recieverId);
    console.log(senderID)
    const reciever = await db.collection("WowUsers").doc(recieverId).get();
    const recieverToken = reciever.data()['fcmToken'];
    const sender = await db.collection('WowUsers').doc(senderID).get();
    const senderToken = sender.data()['fcmToken'];
    if(senderToken !== recieverToken){
    const payload = {
        notification:{
            title:"MESSAGE",
            body:`${sender.data()['username']} sent you a message`,
            click_action:'FLUTTER_NOTIFICATION_CLICK'
        },
        data:{
            type:"msg",
            senderID:senderID
        }
    };
    return fcm.sendToDevice(recieverToken,payload);}
    else{
        return;
    }
});

exports.sendFollowNotif = functions.firestore
.document('/activity feed/{recieverID}/activityItems/{followerId}')
.onCreate(async (snap,context)=>{
    const recieverID = context.params.recieverID;
    const followerId = context.params.followerId;

    const reciever = await db.collection("WowUsers").doc(recieverID).get();
    const recieverToken = reciever.data()['fcmToken'];
    const follower = await db.collection('WowUsers').doc(followerId).get();
    const senderToken = follower.data()['fcmToken'];
    if(senderToken!==recieverToken){
        notifDB.doc(recieverID).collection("notifs").add({
            "from":followerId,
            "type":"follow",
            "timestamp":fieldVal.serverTimestamp(),
            "read":false
        })
        const payload = {
            notification:{
                title:"FOLLOW",
                body:`${follower.data()['username']} followed you!`,
                click_action:'FLUTTER_NOTIFICATION_CLICK'
            },
            data:{
                type:"follow",
                followerID:followerId
            }
        };
    return fcm.sendToDevice(recieverToken,payload);}else{
        return;
    }
});

exports.delFollowNotif = functions.firestore
.document('/activity feed/{recieverID}/activityItems/{followerId}')
.onDelete(async (snap,context)=>{
    const recieverID = context.params.recieverID;
    const followerId = context.params.followerId;
    if(recieverID!==followerId){
        query = notifDB.doc(recieverID).collection("notifs");
        query = query.where("from","==",followerId);
        query = query.where("type","==","follow").get().then((querySnap)=>{
            return querySnap.forEach(element => {
                element.ref.delete();
            });
        });
    }

})

exports.videoDynamicLink = functions.firestore
    .document('videos/{video}')
    .onCreate((snap, context) => {
        let videoData = snap.data();
        const videoId = snap.id;
        const videoRef = snap.ref;

        if (videoData.addedDynamicLink === true) {
            return;
        }

        const options = {
            method: 'POST',
            uri: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${functions.config().applinks.key}`,
            body: {
                "longDynamicLink": makeDynamicLongLink(videoData, videoId)
            },
            json: true
        };

        console.log(options);

        return request(options)
            .then((parsedBody) => {
                console.log(parsedBody);
                return parsedBody.shortLink;
            })
            .then((shortLink) => {
                videoData.shareUrl = shortLink;
                console.log('short link: ' + shortLink);
                videoData.addedDynamicLink = true;
                videoData.dynamicLink = shortLink;
                return videoRef.update(videoData);
            }).catch(error => console.log(error))
    });

function makeDynamicLongLink(videoData, videoId) {
    const link = urlBuilder(`${functions.config().applinks.link}`, {
        queryParams: {
            link: "https://wowtalent.com/player?videoId=" + videoId,
            apn: "com.example.wowtalent",
            afl: "https://www.hellobatlabs.com/",
            st: videoData.videoName,
            sd: "WowTalent - " + videoData.videoName,
            si: videoData.thumbUrl
        }
    });
    console.log(link)
    return link;
}