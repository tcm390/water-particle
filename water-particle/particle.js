import metaversefile from 'metaversefile';
import * as THREE from 'three';
import {
  getRippleGroup,
  getDivingLowerSplash,
  getDivingHigherSplash,
  getSwimmingRippleSplash,
  getDroplet,
  getBubble,
  getLittleSplash,
} from './mesh.js';

const {useSound, useInternals} = metaversefile;
const sounds = useSound();
const soundFiles = sounds.getSoundFiles();

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const rotateY = new THREE.Quaternion();
rotateY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);


class WaterParticleEffect {
  constructor() {
    this.scene = useInternals().sceneLowPriority;
    this.camera = useInternals().camera;
    this.contactWater = false;
    this.contactWater = false;
    this.player = null;
    this.waterSurfaceHeight = 0;

    this.lastContactWater = false;

    this.lastSwimmingHand = null;

    this.collisionPosition = new THREE.Vector3();

    this.fallingSpeed = null;
    this.currentSpeed = 0;
    
    this.rippleMesh = null;
    this.rippleGroup = null;
    this.initRipple();

    this.divingLowerSplash = null;
    this.initDivingLowerSplash();

    this.divingHigherSplash = null;
    this.initDivingHigherSplash();

    this.swimmingRippleSplash = null;
    this.initSwimmingRippleSplash();

    this.dropletgroup = null;
    this.droplet = null;
    this.dropletRipple = null;
    this.initDroplet();

    this.bubble = null;
    this.initBubble();

    this.littleSplash = null;
    this.lastLittleSplashEmitTime = 0;
    this.littleSplashGroup = new THREE.Group();
    this.initLittleSplash();
  }
  
  update() {
    if (!this.player) {
      return;
    }
    const timestamp = performance.now();
    
    {
      // jump in water
      if (this.contactWater && this.contactWater !== this.lastContactWater) {
        this.fallingSpeed = 0 - this.player.characterPhysics.velocity.y;
        this.collisionPosition.set(this.player.position.x, this.waterSurfaceHeight, this.player.position.z);
      }
      else {
        this.fallingSpeed = null;
      }
      // get player speed
      if (this.player.avatar) {
        this.currentSpeed = localVector.set(this.player.avatar.velocity.x, 0, this.player.avatar.velocity.z).length();
        this.currentSpeed *= 0.1;
      }
      // get player direction 
      localVector2.set(0, 0, -1);
      this.playerDir = localVector2.applyQuaternion(this.player.quaternion);
      this.playerDir.normalize();
    }

    const _handleDivingSfx = () => {
      if (this.fallingSpeed > 1) {
        let regex = new RegExp('^water/jump_water[0-9]*.wav$');
        const candidateAudios = soundFiles.water.filter((f) => regex.test(f.name));
        const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
        sounds.playSound(audioSpec);
      }
    };
    _handleDivingSfx();
    
    const _handleRipple = () => {
      if (this.rippleMesh) {
        if (this.fallingSpeed > 3) {
          this.rippleMesh.visible = true;
          this.rippleGroup.position.copy(this.collisionPosition);
          this.rippleMesh.material.uniforms.vBroken.value = 0.1;
          this.rippleMesh.scale.set(0.25, 1, 0.25);
          this.rippleMesh.material.uniforms.uTime.value = 120;
        }
        let falling = this.fallingSpeed > 10 ? 10 : this.fallingSpeed;
        if (this.rippleMesh.material.uniforms.vBroken.value < 1) {
          if (this.rippleMesh.scale.x > 0.15 * (1 + falling * 0.1)) {
            this.rippleMesh.material.uniforms.vBroken.value *= 1.025;
          }
          this.rippleMesh.scale.x += 0.007 * (1 + falling * 0.1);
          this.rippleMesh.scale.z += 0.007 * (1 + falling * 0.1);
          this.rippleMesh.material.uniforms.uTime.value += 0.015;
        }
        else {
          this.rippleMesh.visible = false;
        }
      }
      else {
        if (this.rippleGroup.children.length > 0) {
          if (this.rippleGroup.children[0].children.length > 0) {
            this.rippleMesh = this.rippleGroup.children[0].children[0];
          }
        }
      }
    };
    _handleRipple();

    const _handledivingLowerSplash = () => {
      if (this.divingLowerSplash) { 
        const brokenAttribute = this.divingLowerSplash.geometry.getAttribute('broken');
        const positionsAttribute = this.divingLowerSplash.geometry.getAttribute('positions');
        const scalesAttribute = this.divingLowerSplash.geometry.getAttribute('scales');
        const textureRotationAttribute = this.divingLowerSplash.geometry.getAttribute('textureRotation');
        const particleCount = this.divingLowerSplash.info.particleCount;
        for (let i = 0; i < particleCount; i++) {
          if (this.fallingSpeed > 3) {
            this.divingLowerSplash.info.velocity[i].x = Math.sin(i) * .055 + (Math.random() - 0.5) * 0.001;
            this.divingLowerSplash.info.velocity[i].y = 0.12 + 0.01 * Math.random();
            this.divingLowerSplash.info.velocity[i].z = Math.cos(i) * .055 + (Math.random() - 0.5) * 0.001;
            positionsAttribute.setXYZ(  
              i, 
              this.collisionPosition.x + this.divingLowerSplash.info.velocity[i].x,
              this.collisionPosition.y + 0.1 * Math.random(),
              this.collisionPosition.z + this.divingLowerSplash.info.velocity[i].z
            );
            this.divingLowerSplash.info.velocity[i].divideScalar(5);
            scalesAttribute.setX(i, 0.6);
            textureRotationAttribute.setX(i, Math.random() * 2);
            brokenAttribute.setX(i, 0.2); 
            if (this.higherSplashSw === 2) {
              this.higherSplashSw = 0;
              this.higherSplashPos.copy(this.collisionPosition);
            }
          }
            
          if (scalesAttribute.getX(i) >= 0.6 && scalesAttribute.getX(i) < 2.1) {
            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.2);
          }
          if (scalesAttribute.getX(i) >= 2.1) {
            if (brokenAttribute.getX(i) < 1) {
              brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.015);
              positionsAttribute.setXYZ(  
                i, 
                positionsAttribute.getX(i) + this.divingLowerSplash.info.velocity[i].x,
                positionsAttribute.getY(i) + this.divingLowerSplash.info.velocity[i].y,
                positionsAttribute.getZ(i) + this.divingLowerSplash.info.velocity[i].z
              );
              this.divingLowerSplash.info.velocity[i].add(this.divingLowerSplash.info.acc);
              if (this.higherSplashSw === 0) {
                this.higherSplashSw = 1;
              }
            }
          }
        }
        brokenAttribute.needsUpdate = true;
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        textureRotationAttribute.needsUpdate = true;
        this.divingLowerSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
        this.divingLowerSplash.material.uniforms.waterSurfacePos.value = this.waterSurfaceHeight;
      }
    }
    _handledivingLowerSplash();

    const _handledivingHigherSplash = () => {
      if (this.divingHigherSplash) { 
        const brokenAttribute = this.divingHigherSplash.geometry.getAttribute('broken');
        const positionsAttribute = this.divingHigherSplash.geometry.getAttribute('positions');
        const scalesAttribute = this.divingHigherSplash.geometry.getAttribute('scales');
        const rotationAttribute = this.divingHigherSplash.geometry.getAttribute('rotation');
        const particleCount = this.divingHigherSplash.info.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
          if (this.fallingSpeed > 3) {
            this.divingHigherSplash.info.velocity[i].y = (0.09 + 0.05 * Math.random()) * 0.8;
            brokenAttribute.setX(i, 0.22 + Math.random() * 0.1);
            scalesAttribute.setX(i, 0.5 + Math.random() * 0.5);
            const theta = 2. * Math.PI * i / particleCount;
            positionsAttribute.setXYZ(
              i,
              this.collisionPosition.x + Math.sin(theta) * 0.03,
              this.collisionPosition.y - 1.5,
              this.collisionPosition.z + Math.cos(theta) * 0.03
            ) 
            const n = Math.cos(theta) > 0 ? 1 : -1;
            rotationAttribute.setXYZ(i, -Math.sin(theta) * n * (Math.PI / 2)); 
          }
          if (positionsAttribute.getY(i) >= this.collisionPosition.y - 0.7 && scalesAttribute.getX(i) > 0) {
            if (brokenAttribute.getX(i) < 1) {
              brokenAttribute.setX(i, brokenAttribute.getX(i) * 1.028);
            }
            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.02);
            positionsAttribute.setY(i, positionsAttribute.getY(i) + this.divingHigherSplash.info.velocity[i].y);
            this.divingHigherSplash.info.velocity[i].add(this.divingHigherSplash.info.acc);
          }
          else {
            positionsAttribute.setY(i, positionsAttribute.getY(i) + 0.08);
          } 
        }
        brokenAttribute.needsUpdate = true;
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        rotationAttribute.needsUpdate = true;
        this.divingHigherSplash.material.uniforms.waterSurfacePos.value = this.waterSurfaceHeight;
      }
    }
    _handledivingHigherSplash();

    const _handleSwimmingRippleSplash = () => {
      const particleCount = this.swimmingRippleSplash.info.particleCount;
      const rippleCount = this.swimmingRippleSplash.info.rippleCount;
      if(this.swimmingRippleSplash.info.currentRippleIndex >= rippleCount){
        this.swimmingRippleSplash.info.currentRippleIndex = 0;
      }
      if(this.swimmingRippleSplash.info.currentSplashIndex >= particleCount){
        this.swimmingRippleSplash.info.currentSplashIndex = rippleCount;
      }
      if (this.swimmingRippleSplash) {
        const brokenAttribute = this.swimmingRippleSplash.geometry.getAttribute('broken');
        const positionsAttribute = this.swimmingRippleSplash.geometry.getAttribute('positions');
        const scalesAttribute = this.swimmingRippleSplash.geometry.getAttribute('scales');
        const speedAttribute = this.swimmingRippleSplash.geometry.getAttribute('speed');
        const playerRotationAttribute = this.swimmingRippleSplash.geometry.getAttribute('playerRotation');
        const randAttribute = this.swimmingRippleSplash.geometry.getAttribute('random');
        if (
          timestamp - this.swimmingRippleSplash.info.lastEmmitTime > 170 * Math.pow((1.1 - this.currentSpeed), 0.3) 
          && this.currentSpeed > 0.005 
          && this.contactWater
        ) {
          if(
              (this.player.hasAction('swim') && this.waterSurfaceHeight < this.player.position.y)
              ||(!this.player.hasAction('swim') && this.waterSurfaceHeight >= this.player.position.y - this.player.avatar.height * 0.7)
            ){
              if (this.player.rotation.x !== 0) {
                playerRotationAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, Math.PI + this.player.rotation.y);
              }
              else {
                playerRotationAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, -this.player.rotation.y);
              }

              speedAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, this.currentSpeed);
              brokenAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, 0.1);
              scalesAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, 1.5 + Math.random() * 0.1);
              if (this.currentSpeed > 0.1) {
                positionsAttribute.setXYZ(
                  this.swimmingRippleSplash.info.currentRippleIndex,
                  this.player.position.x + 0.25 * this.playerDir.x + (Math.random() - 0.5) * 0.1, 
                  this.waterSurfaceHeight, 
                  this.player.position.z + 0.25 * this.playerDir.z + (Math.random() - 0.5) * 0.1
                );
              }
              else {
                positionsAttribute.setXYZ(
                  this.swimmingRippleSplash.info.currentRippleIndex,
                  this.player.position.x - 0.05 * this.playerDir.x, 
                  this.waterSurfaceHeight, 
                  this.player.position.z - 0.05 * this.playerDir.z
                );
              }
              speedAttribute.setX(this.swimmingRippleSplash.info.currentSplashIndex, this.currentSpeed);
              if (this.currentSpeed > 0.3) {
                
                brokenAttribute.setX(this.swimmingRippleSplash.info.currentSplashIndex, 0.2 + 0.2 * Math.random());
                scalesAttribute.setX(this.swimmingRippleSplash.info.currentSplashIndex, 1.1 + Math.random() * 0.1);
                positionsAttribute.setXYZ(
                  this.swimmingRippleSplash.info.currentSplashIndex,
                  this.player.position.x - 0.25 * this.playerDir.x + (Math.random() - 0.5) * 0.25, 
                  this.waterSurfaceHeight, 
                  this.player.position.z - 0.25 * this.playerDir.z + (Math.random() - 0.5) * 0.25
                );
                
              }
              else {
                scalesAttribute.setX(this.swimmingRippleSplash.info.currentSplashIndex, 0);
              }
              
              randAttribute.setX(this.swimmingRippleSplash.info.currentRippleIndex, Math.random());
              randAttribute.setX(this.swimmingRippleSplash.info.currentSplashIndex, Math.random());
              this.swimmingRippleSplash.info.currentRippleIndex ++;
              this.swimmingRippleSplash.info.currentSplashIndex ++;
              this.swimmingRippleSplash.info.lastEmmitTime = timestamp;
            }
        }
        for (let i = 0; i < particleCount; i++) {
          scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.1 * (this.currentSpeed + 0.3));
          if (brokenAttribute.getX(i) < 1)
            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.01);
        }
        
        positionsAttribute.needsUpdate = true;
        randAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        speedAttribute.needsUpdate = true;
        brokenAttribute.needsUpdate = true;
        playerRotationAttribute.needsUpdate = true;
        this.swimmingRippleSplash.material.uniforms.uTime.value = timestamp;
      }     
    }
    _handleSwimmingRippleSplash();

    const _handleDroplet = () => {
      if (this.droplet && this.dropletRipple) { 
        const rippleBrokenAttribute = this.dropletRipple.geometry.getAttribute('broken');
        const rippleWaveFreqAttribute = this.dropletRipple.geometry.getAttribute('waveFreq');
        const ripplePositionsAttribute = this.dropletRipple.geometry.getAttribute('positions');
        const rippleScalesAttribute = this.dropletRipple.geometry.getAttribute('scales');
        
        const offsetAttribute = this.droplet.geometry.getAttribute('offset');
        const positionsAttribute = this.droplet.geometry.getAttribute('positions');
        const scalesAttribute = this.droplet.geometry.getAttribute('scales');
        const particleCount = this.droplet.info.particleCount;
        let falling = this.fallingSpeed > 10 ? 10 : this.fallingSpeed;
        let dropletNum = particleCount * (falling / 10);
        dropletNum /= 3;
        falling = falling < 5 ? 7 : falling;
        for (let i = 0; i < particleCount; i++) {
          if (this.fallingSpeed > 0.5) {
            let rand = Math.random();
            scalesAttribute.setX(i, rand);
            positionsAttribute.setXYZ(i, 0, 0, 0);
            
            this.droplet.info.velocity[i].x = (Math.random() - 0.5) * 1 * (falling / 10);
            this.droplet.info.velocity[i].y = Math.random() * 1.4 * (falling / 10);
            this.droplet.info.velocity[i].z = (Math.random() - 0.5) * 1 * (falling / 10);
        
            this.droplet.info.velocity[i].divideScalar(20);
            
            this.droplet.info.alreadyHaveRipple[i] = false;
            if (i > dropletNum) {
              scalesAttribute.setX(i, 0.001);
            }
            this.droplet.info.offset[i] = Math.floor(Math.random() * 29);
            this.droplet.info.startTime[i] = 0;
          }
          if (positionsAttribute.getY(i) > -10) {
            this.droplet.info.velocity[i].add(this.droplet.info.acc);
            scalesAttribute.setX(i, scalesAttribute.getX(i) / 1.035);
            positionsAttribute.setXYZ(
              i,
              positionsAttribute.getX(i) + this.droplet.info.velocity[i].x,
              positionsAttribute.getY(i) + this.droplet.info.velocity[i].y,
              positionsAttribute.getZ(i) + this.droplet.info.velocity[i].z
            )
            this.droplet.info.startTime[i] = this.droplet.info.startTime[i] + 1;
            if (this.droplet.info.startTime[i] % 2 === 0)
              this.droplet.info.offset[i] += 1;
            if (this.droplet.info.offset[i] >= 30) {
              this.droplet.info.offset[i] = 0;
            }
            offsetAttribute.setXY(i, (5 / 6) - Math.floor(this.droplet.info.offset[i] / 6) * (1. / 6.), Math.floor(this.droplet.info.offset[i] % 5) * 0.2);
          }
          if (positionsAttribute.getY(i) < 0 && !this.droplet.info.alreadyHaveRipple[i] && scalesAttribute.getX(i) > 0.001) {
            scalesAttribute.setX(i, 0.0001);
            ripplePositionsAttribute.setXYZ(i, positionsAttribute.getX(i), 0.01, positionsAttribute.getZ(i));
            rippleScalesAttribute.setX(i, Math.random() * 0.2);
            rippleWaveFreqAttribute.setX(i, Math.random() * (i % 10));
            rippleBrokenAttribute.setX(i, Math.random() - 0.8);
            this.droplet.info.alreadyHaveRipple[i] = true;
          }
          rippleScalesAttribute.setX(i, rippleScalesAttribute.getX(i) + 0.02);
          if (rippleBrokenAttribute.getX(i) < 1) {
            rippleBrokenAttribute.setX(i, rippleBrokenAttribute.getX(i) + 0.02);
          }
        }
        
        this.dropletgroup.position.copy(this.collisionPosition);
        offsetAttribute.needsUpdate = true;
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;

        ripplePositionsAttribute.needsUpdate = true;
        rippleScalesAttribute.needsUpdate = true;
        rippleBrokenAttribute.needsUpdate = true;
        rippleWaveFreqAttribute.needsUpdate = true;

        this.dropletRipple.material.uniforms.uTime.value = timestamp / 1000;
        
        this.droplet.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
      }
    }
    _handleDroplet();

    const _handleBubble = () => {
      if (this.bubble && this.player.avatar) {
        const particleCount = this.bubble.info.particleCount;
        let currentEmmit = 0;
        const offsetAttribute = this.bubble.geometry.getAttribute('offset');
        const positionsAttribute = this.bubble.geometry.getAttribute('positions');
        const scalesAttribute = this.bubble.geometry.getAttribute('scales');
        if (timestamp - this.bubble.info.lastEmmitTime > 100 && this.contactWater) {
          for (let i = 0; i < (Math.floor(this.currentSpeed * 10 + 1) * 5); i ++) {
            localVector3.set(this.player.position.x, this.player.position.y, this.player.position.z);
            if (scalesAttribute.getX(i) <= 0) {
              if (this.currentSpeed > 0.1) {
                localVector3.x += (Math.random() - 0.5) * 0.5;
                localVector3.y += -0.2 -(Math.random()) * 0.5;
                localVector3.z += (Math.random() - 0.5) * 0.5;
                this.bubble.info.velocity[i].x = -this.playerDir.x * 0.005;
                this.bubble.info.velocity[i].y = 0.0025 + Math.random() * 0.0025;
                this.bubble.info.velocity[i].z = -this.playerDir.z * 0.005;
              }
              else {
                localVector3.x += -this.playerDir.x * 0.25 + (Math.random() - 0.5) * 0.5;
                localVector3.z += -this.playerDir.z * 0.25 + (Math.random() - 0.5) * 0.5;
                localVector3.y -= this.player.avatar.height * 0.6 + (Math.random()) * 0.2;
                this.bubble.info.velocity[i].x = 0;
                this.bubble.info.velocity[i].y = 0.0025 + Math.random() * 0.0025;
                this.bubble.info.velocity[i].z = 0;
              }
              if (localVector3.y > this.waterSurfaceHeight)
                localVector3.y = this.collisionPosition.y;
              positionsAttribute.setXYZ(i, localVector3.x, localVector3.y, localVector3.z);
              
              this.bubble.info.offset[i] = Math.floor(Math.random() * 29);
              this.bubble.info.lastTime[i] = (50 + Math.random() * 50);
              this.bubble.info.startTime[i] = 0;
              scalesAttribute.setX(i, Math.random());
              if (this.currentSpeed <= 0.1 && !this.player.hasAction('swim')) {
                scalesAttribute.setX(i, 0);
              }
              currentEmmit++;
            }
            if (currentEmmit > this.bubble.info.maxEmmit) {
              this.bubble.info.lastEmmitTime = timestamp;
              break;
            }
          }
        }
        for (let i = 0; i < particleCount; i++) {
          if (positionsAttribute.getY(i) >= this.collisionPosition.y - 0.005) {
            this.bubble.info.velocity[i].y = 0;
          }
          positionsAttribute.setXYZ(  i, 
            positionsAttribute.getX(i) + this.bubble.info.velocity[i].x,
            positionsAttribute.getY(i) + this.bubble.info.velocity[i].y,
            positionsAttribute.getZ(i) + this.bubble.info.velocity[i].z
          );
          this.bubble.info.startTime[i]++;
          if (this.bubble.info.startTime[i] % 2 === 0)
            this.bubble.info.offset[i] ++;
          if (this.bubble.info.offset[i] >= 30) {
            this.bubble.info.offset[i] = 0;
          }
          offsetAttribute.setXY(i, (5 / 6) - Math.floor(this.bubble.info.offset[i] / 6) * (1. / 6.), Math.floor(this.bubble.info.offset[i] % 5) * 0.2);
          if (scalesAttribute.getX(i) > 0)
            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.01);
          if (this.bubble.info.startTime[i] > this.bubble.info.lastTime[i] || positionsAttribute.getY(i) > this.collisionPosition.y) {
            scalesAttribute.setX(i, 0);
          }
        }
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        offsetAttribute.needsUpdate = true;
        
        this.bubble.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
      }
    }
    _handleBubble();

    const _handleLittleSplash = () => {
      this.littleSplashGroup.position.copy(this.player.position);
      if (this.littleSplash) {
        const particleCount = this.littleSplash.info.particleCount;
        const positionsAttribute = this.littleSplash.geometry.getAttribute('positions');
        const scalesAttribute = this.littleSplash.geometry.getAttribute('scales');
        const brokenAttribute = this.littleSplash.geometry.getAttribute('broken');
        for (let i = 0; i < particleCount; i++) {
          if (brokenAttribute.getX(i) < 1) {
            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.01);
            
            
            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.015);
            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.015);
            if(this.currentSpeed > 0.3) {
              positionsAttribute.setXYZ(  
                i, 
                positionsAttribute.getX(i) + - this.playerDir.x * 0.2 * 0.3,
                positionsAttribute.getY(i) + this.littleSplash.info.velocity[i].y,
                positionsAttribute.getZ(i) + - this.playerDir.z * 0.2 * 0.3
              );
            }
            else{
              positionsAttribute.setXYZ(  
                i, 
                positionsAttribute.getX(i),
                positionsAttribute.getY(i)- 0.01,
                positionsAttribute.getZ(i)
              );
            }
            
            
            //this.littleSplash.info.velocity[i].y += this.littleSplash.info.acc.y;
          }
        }
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        brokenAttribute.needsUpdate = true;
        
        this.littleSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
        this.littleSplash.material.uniforms.waterSurfacePos.value = this.waterSurfaceHeight;
      }
    }
    _handleLittleSplash();

    const _playLittleSplash = (px, py, pz, maxEmmit, scale, velocity) => {
      if (this.littleSplash) {
        let count = 0;
        const particleCount = this.littleSplash.info.particleCount;
        const positionsAttribute = this.littleSplash.geometry.getAttribute('positions');
        const scalesAttribute = this.littleSplash.geometry.getAttribute('scales');
        const brokenAttribute = this.littleSplash.geometry.getAttribute('broken');
        const textureRotationAttribute = this.littleSplash.geometry.getAttribute('textureRotation');
        for (let i = 0; i < particleCount; i++) {
          if (brokenAttribute.getX(i) >= 1) {
            // this.littleSplash.info.velocity[i].set(velocity.x, velocity.y, velocity.z);
            scalesAttribute.setX(i, (1 + Math.random()) * scale);
            brokenAttribute.setX(i, 0 + Math.random() * 0.1);
            textureRotationAttribute.setX(i, Math.random() * 2);
            positionsAttribute.setXYZ(  
              i, 
              px + (Math.random() - 0.5) * 0.02,
              py + (Math.random() - 0.5) * 0.02,
              pz + (Math.random() - 0.5) * 0.02
            );
            // this.littleSplash.info.velocity[i].divideScalar(5);
            brokenAttribute.setX(i, 0.2 + Math.random() * 0.15);
            count ++;
          }
          if (count >= maxEmmit) {
            break;
          }
        }
        positionsAttribute.needsUpdate = true;
        scalesAttribute.needsUpdate = true;
        brokenAttribute.needsUpdate = true;
        textureRotationAttribute.needsUpdate = true;
      }
    }
    
    const _handleSwimmingSplash = (swimAction) => {
      localVector4.set(this.playerDir.x, this.playerDir.y, this.playerDir.z).applyQuaternion(rotateY);
      if (swimAction.animationType === 'breaststroke') {
      }
      else if (swimAction.animationType === 'freestyle'){
        if (this.player.avatarCharacterSfx.currentSwimmingHand && this.lastSwimmingHand !== this.player.avatarCharacterSfx.currentSwimmingHand) {
          const right = this.player.avatarCharacterSfx.currentSwimmingHand === 'right' ? 1 : -1;
          _playLittleSplash(
            this.playerDir.x * 0.4 + (Math.random() - 0.5) * 0.1 + localVector4.x * 0.15 * right, 
            -0.25, 
            this.playerDir.z * 0.4 + (Math.random() - 0.5) * 0.1 + localVector4.z * 0.15 * right,
            5,
            1 + Math.random() * 0.2,
            localVector6
          );
        }
        if(timestamp - this.lastLittleSplashEmitTime > 30) {
          // localVector6.set(
          //   - this.playerDir.x * 0.2,
          //   0, 
          //   - this.playerDir.z * 0.2 
          // );
          const right = this.player.avatarCharacterSfx.currentSwimmingHand === 'right' ? 1 : 0.8;
          const left = this.player.avatarCharacterSfx.currentSwimmingHand === 'right' ? 0.8 : 1;
          _playLittleSplash(
            this.playerDir.x * 0.1 + (Math.random() - 0.5) * 0.1 + localVector4.x * 0.1, 
            -0.25, 
            this.playerDir.z * 0.1 + (Math.random() - 0.5) * 0.1 + localVector4.z * 0.1,
            1,
            right + Math.random() * 0.2,
            localVector6
          );
          _playLittleSplash(
            this.playerDir.x * 0.1 + (Math.random() - 0.5) * 0.1 + localVector4.x * -0.1, 
            -0.25, 
            this.playerDir.z * 0.1 + (Math.random() - 0.5) * 0.1 + localVector4.z * -0.1,
            1,
            left + Math.random() * 0.2,
            localVector6
          );
          this.lastLittleSplashEmitTime = timestamp;
        }
      }
      
      this.lastSwimmingHand = this.player.avatarCharacterSfx.currentSwimmingHand; 
    }

    const swimAction = this.player.getAction('swim');
    const hasSwim = !!swimAction;
    if (hasSwim && this.waterSurfaceHeight < this.player.position.y) {
       _handleSwimmingSplash(swimAction);
    }
   
    
    this.lastContactWater = this.contactWater;
    this.scene.updateMatrixWorld();
  }

  //########################################################## initialize particle mesh #####################################################
  initRipple() {
    this.rippleGroup = getRippleGroup();
    this.scene.add(this.rippleGroup);
  }
  initDivingLowerSplash() {
    this.divingLowerSplash = getDivingLowerSplash();
    this.scene.add(this.divingLowerSplash);
  }
  initDivingHigherSplash() {
    this.divingHigherSplash = getDivingHigherSplash();
    this.scene.add(this.divingHigherSplash);
  }
  initSwimmingRippleSplash() {
    this.swimmingRippleSplash = getSwimmingRippleSplash();
    this.scene.add(this.swimmingRippleSplash);
  }
  initDroplet() {
    this.dropletgroup = getDroplet();
    this.droplet = this.dropletgroup.children[0];
    this.dropletRipple = this.dropletgroup.children[1];
    this.scene.add(this.dropletgroup);
  }
  initBubble() {
    this.bubble = getBubble();
    this.scene.add(this.bubble);
  }
  initLittleSplash() {
    this.littleSplash = getLittleSplash();
    this.littleSplashGroup.add(this.littleSplash)
    this.scene.add(this.littleSplashGroup);
  }
}

export default WaterParticleEffect;