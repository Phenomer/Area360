import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths';
import { Mesh, MeshBuilder } from '@babylonjs/core/Meshes';
import { StandardMaterial } from '@babylonjs/core/Materials';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { ScenePerformancePriority } from '@babylonjs/core/scene';
import { StageFloor } from './Stage/StageFloor';
import { SceneLogger } from './Stage/SceneLogger';
import { CharacterLoader } from './Character/CharacterLoader';
import { Inspector } from '@babylonjs/inspector';
import { SphereVideo } from './Stage/SphereVideo';
import { StageLight } from './Stage/StageLight';
import { StageCamera } from './Stage/StageCamera';
import { TalkManager } from './TalkManager';

// https://learn.microsoft.com/ja-jp/windows/mixed-reality/develop/javascript/tutorials/babylonjs-webxr-helloworld/introduction-01
// https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

export class PanoramaViewer {
    canvas: HTMLCanvasElement;
    vrMode: boolean;
    withCharacter: boolean;
    withInspector: boolean;
    engine: Engine;
    scene: Scene;
    logger: SceneLogger;
    light: StageLight;
    camera: StageCamera;
    character?: CharacterLoader;
    talk: TalkManager;

    constructor(canvas: HTMLCanvasElement, talk: TalkManager,
        vrMode: boolean, withCharacter: boolean, withInspector: boolean) {
        SceneLoader.ShowLoadingScreen = false;

        console.log('init PanoramaViewer!');
        this.talk = talk;
        this.vrMode = vrMode;
        this.withInspector = withInspector;
        this.withCharacter = withCharacter;
        this.canvas = canvas;
        this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.scene = new Scene(this.engine);
        this.light = new StageLight(this.scene);
        this.camera = new StageCamera(this.canvas, this.scene, this.vrMode);

        if (this.withInspector) {
            const bodyElement = document.querySelector('body');
            if (bodyElement) {
                bodyElement.style.overflow = 'auto';
            }
            Inspector.Show(this.scene, {});
        }
        this.logger = new SceneLogger();
        //this.scene.performancePriority = ScenePerformancePriority.Aggressive;
        this.scene.performancePriority = ScenePerformancePriority.BackwardCompatible;
        this.scene.clearColor = new Color4(0.5, 0.5, 0.5, 1); // Background color
    }

    run(): void {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    resize(): void {
        this.engine.resize();
    }

    async createScene(): Promise<void> {
        if (this.vrMode) {
            const xrHelper: WebXRDefaultExperience = await WebXRDefaultExperience.CreateAsync(this.scene);
            //const xrHelper: WebXRDefaultExperience = await this.scene.createDefaultXRExperienceAsync();
            console.log(xrHelper);
        } else {
        }

        this.createWorldSphere();

        if (this.withCharacter) {
            const character: CharacterLoader = new CharacterLoader(this.scene, this.light, this.camera, this.talk);
            character.loadModel();
            this.character = character;
        }
        new StageFloor(this.scene);
    }

    private createWorldSphere(): void {
        const sphere: Mesh = MeshBuilder.CreateSphere('WorldSphere', { diameter: 200 }, this.scene);
        const material: StandardMaterial = new StandardMaterial('WorldSphereMaterial', this.scene);
        const sMovie: SphereVideo = new SphereVideo(this.scene, this.light, 'movie');
        material.diffuseTexture = sMovie.videoTexture;
        /* 球の内側をレンダリング */
        material.backFaceCulling = false;
        material.ambientColor = new Color3(1, 1, 1);
        material.emissiveColor = new Color3(1, 1, 1);
        sphere.material = material;
        sphere.position.y = 0;
        sphere.scaling.z = -1;
    }

    dispose(): void {
        this.engine.stopRenderLoop();
        this.scene.dispose();
        this.engine.dispose();
    }
}
