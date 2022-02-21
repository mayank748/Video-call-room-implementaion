import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
// import cameravideo from "../assets/cameravideo.svg"
// import cameravideooff from "../assets/cameravideooff.svg"
import endcall from "../assets/endcall.svg"
// import micmute from "../assets/micmute.svg"
// import mic from "../assets/mic.svg"
import "./room.scss"
// import Webcam from "react-webcam";
import * as icons from '../assets/index'
// import Draggable from 'react-draggable';

const StyledVideo = styled.video`
height: 30%;
width: 30%;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
        // eslint-disable-next-line
    }, []);

    return (
        <StyledVideo id='localVideo' playsInline autoPlay ref={ref} onPlayCapture={VolumeSetting} />
    );
}

function VolumeSetting() {
    var vid = document.getElementById("localVideo");
    vid.volume = 0.0;
}

const Room = (props) => {
    console.log(props);
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    const [localstream, setlocalStream] = useState([]);
    let [isFlipCamera, setFlipCamer] = useState(true);

    let managerDetails = {
        // managerCode: props.agentId + ":" + uuidv4(),
        managerCode: 813,
        storeCode: 'erreportingdemoEZ004',
        isOnline: true,
        isBusy: false,
        isCalling: false,
    };

    useEffect(() => {
        socketRef.current = io.connect("http://localhost:4441/", { transports: ['websocket'] });
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(stream => {
                userVideo.current.srcObject = stream;
                setlocalStream(stream);
                console.log("inside")
                socketRef.current.emit("join_room", { roomID: roomID });
                socketRef.current.on("usersInLink" + roomID, users => {
                    const peers = [];
                    debugger
                    users.forEach(userID => {
                        const peer = createPeer(userID, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        })
                        peers.push(peer);
                    })
                    setPeers(peers);
                })

                socketRef.current.on("user_joined", payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    })

                    setPeers(users => [...users, peer]);
                });

                socketRef.current.on("receiving_returned_signal", payload => {
                    console.log(payload);

                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    item.peer.signal(payload.signal);
                });
            })
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        socketRef.current.emit("storeOnline", managerDetails.storeCode);
        socketRef.current.emit("storeMangerDetail", managerDetails);
    }, [])

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending_signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning_signal", { signal, callerID })
        })
        console.log('incomingSignal', incomingSignal);
        peer.signal(incomingSignal);

        return peer;
    }

    const stopCall = () => {
        userVideo.current.srcObject = null;
        socketRef.current.emit('deleteLink', managerDetails.storeCode + managerDetails.managerCode)
        window.location.replace('/');
    }
    function updateAudio() {
        var item = document.getElementById('mic');
        item.src = item.getAttribute("src") === icons.micmute ? icons.mic : icons.micmute;
        localstream.getAudioTracks()[0].enabled = localstream.getAudioTracks()[0].enabled === false ? true : false;
    }

    function updateVedio() {
        var item = document.getElementById('camera');
        item.src = item.getAttribute("src") === icons.cameravideooff ? icons.cameravideo : icons.cameravideooff;
        localstream.getVideoTracks()[0].enabled = localstream.getVideoTracks()[0].enabled === false ? true : false;
    }

    const flipCamera = () => {
        setFlipCamer(!isFlipCamera)
        //flipCameraBtn();
    }
    const flipCameraBtn = () => {
        console.log('inside flip button');
        if (userVideo.current) {
            userVideo.current.srcObject.getTracks().forEach(async function (track) {
                await track.stop();
            });
            userVideo.current.srcObject = null;
        }
        var oldVideoTrack = localstream.getVideoTracks()[0];
        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: !isFlipCamera ? "user" : "environment",
                    deviceId: {
                        exact: window.selectedCamera,
                    },
                },
                audio: true,
            })
            .then((NewStream) => {
                console.log("newTrack", NewStream);
                userVideo.current.srcObject = NewStream;
                peersRef.current.replaceTrack(
                    oldVideoTrack,
                    NewStream.getVideoTracks()[0],
                    localstream
                );
            })
            .catch((error) => {
                console.log("media error: ", error);
            });
    }

    return (
        <div>
            <StyledVideo id='localVideo' playsInline muted ref={userVideo} autoPlay onPlayCapture={VolumeSetting} />
            {peers.map((peer, index) => {
                console.log(peer);
                return (
                    // <Draggable>
                    <div className="draggable">
                        <Video id='myvideo' key={index} peer={peer} />
                    </div>
                    // </Draggable>
                );
            })}
            <div className="buttonsContainer">
                <div className="videoCon">
                    <img id="endCall" className="logSize" src={endcall} onClick={stopCall} alt="prop" />
                </div>
                <div className="videoCon">
                    <img id="mic" className="logSize" src={icons.mic} onClick={updateAudio} alt="prop" />
                </div>
                <div className="videoCon">
                    <img id="camera" className="logSize" src={icons.cameravideo} onClick={updateVedio} alt="prop" />
                </div>
                <div className="videoCon">
                    <button onClick={flipCamera}>Flip</button>
                </div>
            </div>
        </div>
    );
};

export default Room;
