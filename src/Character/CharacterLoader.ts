// https://sandbox.babylonjs.com/
import { AbstractMesh } from "@babylonjs/core/Meshes";
import { Scene } from "@babylonjs/core/scene";
import { } from "@babylonjs/core/Rendering/outlineRenderer"; // これがないとAbstractMesh.renderOutlineがundefinedになる
import { SceneLoader } from "@babylonjs/core/Loading";
import { Color3 } from "@babylonjs/core/Maths/math";
import { IShadowLight, ShadowGenerator } from "@babylonjs/core/Lights";
import { NodeMaterial } from "@babylonjs/core/Materials/Node";
import { GLTFFileLoader } from "@babylonjs/loaders/glTF";
import { CharacterBody } from "./Morph/CharacterBody";
import { CharacterEye } from "./Morph/CharacterEye";
import { CharacterMayu } from "./Morph/CharacterMayu";
import { CharacterMouse } from "./Morph/CharacterMouse";
import { CharacterBone } from "./CharacterBone";
import { StageCamera } from "../Stage/StageCamera";
import { StageLight } from "../Stage/StageLight";
import { TalkManager } from "../TalkManager";

SceneLoader.RegisterPlugin(new GLTFFileLoader());

interface CharacterMorph {
    body: CharacterBody,
    eye: CharacterEye,
    mayu: CharacterMayu,
    mouse: CharacterMouse
}

interface CharacterBones {
    root: CharacterBone
}

export class CharacterLoader {
    scene: Scene;
    light: StageLight;
    camera: StageCamera;
    talk: TalkManager;
    basePath: string;
    public morph: CharacterMorph;
    public bones: CharacterBones;

    constructor(scene: Scene, light: StageLight, camera: StageCamera, talk: TalkManager) {
        this.scene = scene;
        this.light = light;
        this.camera = camera;
        this.talk = talk;
        this.basePath = '/area360/characters/';
        this.morph = {
            body: new CharacterBody(),
            eye: new CharacterEye(),
            mayu: new CharacterMayu(),
            mouse: new CharacterMouse(talk)
        }
        this.bones = {
            root: new CharacterBone()
        }
    }

    availabilityCheck(onSuccess: () => void, onFailure: () => void) {
        fetch(this.basePath + "gloria.glb", { "method": "HEAD" }).then((res) => {
            if (res.status == 200 && onSuccess != null) {
                onSuccess();
            } else if (onFailure != null) {
                onFailure();
            }
        });
    }

    loadModel() {
        /* 
            Append(rootUrl, sceneFilename?, scene?, onSuccess?, onProgress?, onError?, 
                   pluginExtension?, name?): Nullable<ISceneLoaderPlugin | ISceneLoaderPluginAsync>
        */
        SceneLoader.Append(this.basePath, "gloria.glb", this.scene, (scene) => {
            try {


                //this.meshVisibility(false);
                this.setupMaterial("Dress", this.basePath + "dressMaterial.json", scene.getMeshByName("MarnieDress"));
                this.setupMaterial("Hat", this.basePath + "hatMaterial.json", scene.getMeshByName("Hat"));
                this.setupMaterial("Hair", this.basePath + "hairMaterial.json", scene.getMeshByName("Hair"));
                // 頭
                this.setupMaterial("Head", this.basePath + "headMaterial.json", scene.getMeshByName("Head_primitive0"));
                // 顔
                this.setupMaterial("Face", this.basePath + "faceMaterial.json", scene.getMeshByName("Head_primitive1"));
                // 眉毛
                this.setupMaterial("Mayu", this.basePath + "mayuMaterial.json", scene.getMeshByName("Head_primitive2"));
                // 左目
                this.setupMaterial("Eye.l", this.basePath + "bodyMaterial.json", scene.getMeshByName("Head_primitive3"));
                // 右目
                this.setupMaterial("Eye.r", this.basePath + "bodyMaterial.json", scene.getMeshByName("Head_primitive4"));
                this.setupMaterial("Body", this.basePath + "bodyMaterial.json", scene.getMeshByName("Body"));
                //this.setupTexture(scene);
                // ロード中に中途半端な状態で見えてしまう問題に対する暫定的な対策
                //setTimeout(() => { this.meshVisibility(true) }, 5000);

                //const charBone: CharacterBone = new CharacterBone();
                this.bones.root.setupBone(scene);
                this.morph.body.setupMorph(scene);
                this.morph.eye.setupMorph(scene);
                this.morph.mouse.setupMorph(scene);
                this.morph.mayu.setupMorph(scene);
                this.eyeCameraTracking();
            } catch (e) {
                console.error(e);
            }
        }, () => { console.log('SceneLoader loading...'); }, () => { console.error('SceneLoader failed.'); });
    }

    meshVisibility(visible = true) {
        this.scene.meshes.forEach((mesh) => {
            mesh.setEnabled(visible);
        });
    }

    private eyeCameraTracking() {
        this.scene.registerBeforeRender(() => {
            const cameraDirection = this.camera.camera.getTarget().subtract(this.camera.camera.position).normalize();
            this.bones.root.setEyeTarget(
                (this.camera.camera.beta - Math.PI / 2) / 2,
                -Math.atan2(cameraDirection.x, cameraDirection.z) - this.camera.defaultBeta,
                0
            );
        });
    }

    private setupMaterial(matName: string, matFile: string, mesh: AbstractMesh | null) {
        if (mesh == null) { return };
        mesh.renderingGroupId = 1;
        NodeMaterial.ParseFromFileAsync(matName, matFile, this.scene).then((nMat) => {
            let inputBlock = nMat.getInputBlockByPredicate((b) => b.name === "diffuseCut");
            if (inputBlock) {
                inputBlock.value = 0.21;
            }
            inputBlock = nMat.getInputBlockByPredicate((b) => b.name === "shadowItensity");
            if (inputBlock) {
                inputBlock.value = 0.87;
            }
            inputBlock = nMat.getInputBlockByPredicate((b) => b.name === "rimIntensity");
            if (inputBlock) {
                inputBlock.value = 0.08;
            }
            //mesh.position.y = ;
            //mesh.scaling.scaleInPlace(0.1);
            //mesh.scaling.x = -1;
            //mesh.scaling.y = -1;
            //mesh.scaling.z = -1;
            // ノードマテリアルのテクスチャのUVを更新するサンプル
            //this.scene.registerBeforeRender(() => {
            //nMat.getBlockByName("Texture").texture.uOffset += 0.0001;
            //});
            // 画像を更新したい場合
            //let texture = new BABYLON.Texture(texturePath, this.scene);
            //console.log(nMat.getBlockByName("Texture").texture);
            //nMat.getBlockByName("Texture").texture = texture;


            // メッシュの一部が透明になる問題の対策
            //nMat.backFaceCulling = false;
            mesh.hasVertexAlpha = false;

            // マテリアル
            mesh.material = nMat;

            /*
            const material: StandardMaterial = new StandardMaterial('tamaMaterial', this.scene);
            material.diffuseColor = new Color3(255,0, 255);
            material.ambientColor = new Color3(1, 1, 1);
            material.emissiveColor = new Color3(1, 1, 1);
            mesh.material = material;
            */

            // アウトライン
            //mesh.skeleton.enableBlending(0.01);
            mesh.renderOutline = true;
            mesh.outlineWidth = 0.001;
            mesh.outlineColor = Color3.Black();
            //mesh.overlayColor = BABYLON.Color3.Green();
            //mesh.renderOverlay = true;
            // 影
            const shadowGenerator: ShadowGenerator = new ShadowGenerator(2048, this.light.characterLight as IShadowLight, true);
            shadowGenerator.getShadowMap()?.renderList?.push(mesh)
            shadowGenerator.setDarkness(0.2);
            shadowGenerator.filter = ShadowGenerator.FILTER_PCSS;

            // shadowGenerator.usePoissonSampling = true;
            //shadowGenerator.useContactHardeningShadow = true;
            // shadowGenerator.usePercentageCloserFiltering = true;

            shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
            shadowGenerator.bias = 0.014
            mesh.receiveShadows = true;
            //mesh.useVertexColors = false;
            //mesh.useVertexAlpha = false;
            // freezeするとシェイプキーが正常にレンダリングできなくなる
            // nMat.freeze();
        });
    }

    /*
    private setupHeadMorph() {
        ["Head_primitive0", "Head_primitive1", "Head_primitive2", "Head_primitive3", "Head_primitive4"].forEach((mName) => {
            let headMesh: Nullable<AbstractMesh> = this.scene.getMeshByName(mName);
            if (headMesh == null) { return; };
            let morphTargetManager = headMesh.morphTargetManager;
            if (morphTargetManager == null) { return; };

            // 首が微妙にズレて隙間が空く問題を修正
            headMesh.position.x = -0.00155;  // 左右(マイナスで左に)
            headMesh.position.y = -0.00085; // 高さ(マイナスで低く)
            headMesh.position.z = -0.0001; // 前後(マイナスで前に)

            this.scene.registerBeforeRender(() => {
                // this.updateMabataki();
                //this.randomMouse();
                for (let i = 0; i < morphTargetManager.numTargets; i++) {
                    //let target = morphTargetManager.getTarget(i);
                    //target.influence = Math.sin((window.performance.now() / 180) * Math.PI);
                    //target.influence = this.headMorphValue[target.name];
                }
            });
        });
    }
    */
}
