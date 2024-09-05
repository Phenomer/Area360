import { PanoramaViewer } from './PanoramaViewer';
import { DialogManager } from './DialogManager';
import { UserMediaManager } from './RTC/UserMediaManager';
import { RTCTalkClient } from './RTC/RTCTalkClient';
import { TelopChannelMessage, TextChannelMessage } from "./RTC/RTCMessage";
import { TalkManager } from './TalkManager';

function startPanoramaViewer(dialog: DialogManager): void {
    const talkManager: TalkManager = new TalkManager();
    const userMediaManager: UserMediaManager = new UserMediaManager();
    if (dialog.enableTalk()) {
        userMediaManager.getUserMedia(
            (audioTrack: MediaStreamTrack) => {
                const talkClient: RTCTalkClient = new RTCTalkClient(audioTrack, true, 'stun:stun.negix.org:3478');
                talkClient.start();
                talkClient.textChannelCallback = (msg: TextChannelMessage) => {
                    talkManager.addTextChannelMessage(msg);
                };
                talkClient.telopChannelCallback = (msg: TelopChannelMessage) => {
                    talkManager.addTelopChannelMessage(msg);
                };
            },
            (videoTrack: MediaStreamTrack) => { console.error(videoTrack) },
            (err: any) => { console.error(err); }
        )
    }
    const canvas: HTMLCanvasElement = document.querySelector('#renderCanvas') as HTMLCanvasElement;
    const viewer: PanoramaViewer = new PanoramaViewer(
        canvas, talkManager,
        dialog.enableVR(), dialog.enableCharacter(), dialog.enableInspector()
    );

    dialog.closeDialog();
    viewer.createScene();
    viewer.run();

    window.addEventListener("resize", () => {
        viewer.resize();
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === 'Escape') {
            viewer.dispose();
            dialog.showDialog();
            userMediaManager.close();
        }
    });

}

const dialog: DialogManager = new DialogManager();
dialog.showDialog();

window.addEventListener("load", () => {
    document.querySelector('#playButton')?.addEventListener('click', async () => {
        startPanoramaViewer(dialog);
    });
});
