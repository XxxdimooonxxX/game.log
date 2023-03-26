var canvas = document.getElementById("renderCanvas");

        var startRenderLoop = function (engine, canvas) {
            engine.runRenderLoop(function () {
                if (sceneToRender && sceneToRender.activeCamera) {
                    sceneToRender.render();
                }
            });
        }

        var engine = null;
        var scene = null;
        var sceneToRender = null;
        var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true,  disableWebGL2Support: false}); };
		
        var vehicle, chassisMesh, redMaterial, blueMaterial, greenMaterial, wheelMaterial, brakeLightMaterial, reverseLightMaterial, indicatorLightL, indicatorLightR;
		var wheelMeshes = [];
		const wheelUV = [];
		var actions = {accelerate:false,brake:false,right:false,left:false};
		
		var keysActions = {
		"KeyW":'acceleration',
		"KeyS":'braking',
		"KeyA":'left',
		"KeyD":'right'
		};

		var vehicleReady = false;  

		var ZERO_QUATERNION = new BABYLON.Quaternion(); 

		//Please refer to the ammo.js vehicle documentation to know more about these values.
		//https://rawcdn.githack.com/kripken/ammo.js/99d0ec0b1e26d7ccc13e013caba8e8a5c98d953b/examples/webgl_demo_vehicle/index.html

		//This demo is based on this PG: https://playground.babylonjs.com/#609QKP#2
		
		var chassisWidth = 1.8;	
		var chassisHeight = .6;
		var chassisLength = 4;
		var massVehicle = 200;
		
		var wheelAxisPositionBack = -2;
		var wheelRadiusBack = .4;
		var wheelWidthBack = .3;
		var wheelHalfTrackBack = 1.2;
		var wheelAxisHeightBack = 0.4;
		
		var wheelAxisFrontPosition = 2.0;
		var wheelHalfTrackFront = 1.2;
		var wheelAxisHeightFront = 0.4;
		var wheelRadiusFront = .4;
		var wheelWidthFront = .3;
		
		var friction = 5;
		var suspensionStiffness = 10;
		var suspensionDamping = 0.3;
		var suspensionCompression = 4.4;
		var suspensionRestLength = 0.6;
		var rollInfluence = 0.0;
		
		var steeringIncrement = .02;
		var steeringClamp = 0.4;
		var maxEngineForce = 500;
		var maxBreakingForce = 10;
		var incEngine = 10.0;
		
		var FRONT_LEFT = 0;
		var FRONT_RIGHT = 1;
		var BACK_LEFT = 2;
		var BACK_RIGHT = 3;
								
		var wheelDirectionCS0;
		var wheelAxleCS;
				
		var engineForce = 0;
		var vehicleSteering = 0;
		var breakingForce = 0;


	var createScene = async function () 
	{
		// Setup basic scene
		var scene = new BABYLON.Scene(engine);
		
		//we create our car follow camera in createChassisMesh function
		// var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10));
		// camera.setTarget(BABYLON.Vector3.Zero());
		// camera.attachControl(canvas, true);
		
		//create our light
		// var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0));
		var light = new BABYLON.PointLight("light1", new BABYLON.Vector3(10, 10, 0));
		// light.rotate(BABYLON.Axis.Y, Math.PI/3, BABYLON.Space.LOCAL);
		light.intensity = 100;
		var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
		// light.rotate(BABYLON.Axis.Y, 3*Math.PI/2, BABYLON.Space.LOCAL);
		// debug axes
		const axes = new BABYLON.AxesViewer(scene, 2);
		axes.xAxis.parent = light;
		axes.yAxis.parent = light;
		axes.zAxis.parent = light;
		// shadowGenerator.getShadowMap().renderList.push(the_mesh_that_casts_a_shadow);
		// mesh_that_receives_the_shadow.receiveShadows = true;
	
		//load our wheel material
		wheelMaterial = new BABYLON.StandardMaterial("WheelMaterial"); 
		wheelMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/wheel.png");
		wheelMaterial.emissiveTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/wheel.png");
		
		//we store the wheel face UVs once and reuse for each wheel		
		wheelUV[0] = new BABYLON.Vector4(0, 0, 1, 1);
		wheelUV[1] = new BABYLON.Vector4(0, 0.5, 0, 0.5);
		wheelUV[2] = new BABYLON.Vector4(0, 0, 1, 1);
		
		// Enable physics
		await Ammo();
		scene.enablePhysics(new BABYLON.Vector3(0,-10,0), new BABYLON.AmmoJSPlugin());

		//this is the direction of motion of wheels
		wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
		
		//this is the direction of wheel axle
		wheelAxleCS = new Ammo.btVector3(-1, 0, 0);
		
		//create our ground floor
		BABYLON.SceneLoader.ImportMesh(
            null,
            'models/',
            'map.glb',
            scene,
            (meshArray)=>{
				let ground = new BABYLON.MeshBuilder.CreateBox('box', {
					width: 100,
					depth: 100,
					height: 0.1
				}, scene);
				matGround  = new BABYLON.StandardMaterial("material", scene); 
				matGround.alpha = 0.1;
				ground.material = matGround; 
				ground.translate(BABYLON.Axis.Y, -2, BABYLON.Space.WORLD);

				let ground2 = meshArray[0];
				ground2.position.z = 10;

				
				ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 });
				ground2.physicsImpostor = new BABYLON.PhysicsImpostor(ground2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 });
				ground.receiveShadows = true;
				ground2.receiveShadows = true;
		});
		// var ground = BABYLON.Mesh.CreateGround("ground", 460, 460, 2);
		// ground.material = new BABYLON.GridMaterial("groundMaterial");


		var checkModels = 0;
		//create our car
		BABYLON.SceneLoader.ImportMesh(
            null,
            'models/',
            'vaz_2104.glb',
            scene,
            (meshArray)=>{
                let vaz = meshArray[0];
				matVaz  = new BABYLON.StandardMaterial("material", scene); 
				// matVaz.diffuseTexture = new BABYLON.Texture("../models/texture/1.png");
				// matVaz.emissiveColor = new BABYLON.Color3(255, 255, 255);
				// vaz.diffuseTexture = new BABYLON.Texture("../models/texture/tex_u1_v1_diffuse.jpg");
				// vaz.material = matVaz;
				// vaz.scalling = new BABYLON.Vector3(0.1,0.1,0.1);
				// vaz.rotateion = new BABYLON.Vector3(0,0,90);
				// vaz.rotate(BABYLON.Axis.Z, Math.PI/4, BABYLON.Space.WORLD);
                // vaz.position = new BABYLON.Vector3(0,0,0);

				createVehicle(scene, new BABYLON.Vector3(0, 4, 0), ZERO_QUATERNION, vaz);
				
				//attach key event handlers
				window.addEventListener( 'keydown', keydown);
				window.addEventListener( 'keyup', keyup);

				var time = 0;
				
				//register prerender callback to initiate 
				scene.registerBeforeRender(function(){

					//time step delta (dt)
					var dt = engine.getDeltaTime().toFixed()/1000;
					time += dt;
					var val = Math.round(Math.abs(Math.sin(time*5)));
					
					if(vehicleReady){
						//get the cars current speed from ammo.js
						var speed = vehicle.getCurrentSpeedKmHour();
						var maxSteerVal = 0.2;
						breakingForce = 0;
						engineForce = 0;

						//see if we are accelerating
						if(actions.acceleration){
							//are we decreasing or  increasing
							if (speed < -1){
								breakingForce = maxBreakingForce;
							}else {
								engineForce = maxEngineForce;
							}
								
						} else if(actions.braking){
							//are we decreasing or increasing to signify we want to go reverse
							if (speed > 1){
								breakingForce = maxBreakingForce;
							}else {
								engineForce = -maxEngineForce ;
							}
						} 
						
						//are we turning right
						if(actions.right)
						{			
							if (vehicleSteering < steeringClamp){
								vehicleSteering += steeringIncrement;
							}
								
						} 
						//are we turning left
						else if(actions.left)
						{									
							if (vehicleSteering > -steeringClamp){
								vehicleSteering -= steeringIncrement;
							}
								
						} else {
							vehicleSteering *= 0.95 ; //this dampens the return of the wheel when the user releases the key
						}
								
						//apply forces on the vehicle
						vehicle.applyEngineForce(engineForce, FRONT_LEFT);
						vehicle.applyEngineForce(engineForce, FRONT_RIGHT);
						
						//apply break on the vehicle with unequal amount of force for front and rear wheels				
						vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
						vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
						vehicle.setBrake(breakingForce, BACK_LEFT);
						vehicle.setBrake(breakingForce, BACK_RIGHT);
								
						//apply the steering value
						vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
						vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);
								
						//once we have applied all forces to ammo.js vehicle, we need to update the 
						//position and orientation of our car chassis and wheel.  				
						var tm, p, q, i;
						var n = vehicle.getNumWheels();
						
						//get the updated position and orientation of each wheel
						for (i = 0; i < n; i++) {
							vehicle.updateWheelTransform(i, true);
							tm = vehicle.getWheelTransformWS(i);
							p = tm.getOrigin();
							q = tm.getRotation();
							wheelMeshes[i].position.set(p.x(), p.y(), p.z());
							wheelMeshes[i].rotationQuaternion.set(q.x(), q.y(), q.z(), q.w());
							
						}
						
						//get the updated position and orientation of our car chassis
						tm = vehicle.getChassisWorldTransform();
						p = tm.getOrigin();
						q = tm.getRotation();

						// vaz.position = new BABYLON.Vector3(-10,0,0);
						vaz.position.set(p.x(), p.y(), p.z()); 
						// chassisMesh.position.x = p.x();
						vaz.rotationQuaternion.set(q.x(), q.y(), q.z(), q.w());   

						// vaz.translate(BABYLON.Axis.X, 10.5, BABYLON.Space.LOCAL);
						// vaz.translate(BABYLON.Axis.Y, 10.5, BABYLON.Space.LOCAL);
						vaz.translate(BABYLON.Axis.Z, 1.8, BABYLON.Space.LOCAL);
						vaz.scaling = new BABYLON.Vector3(0.2,0.2,0.2);
						// shadowGenerator.getShadowMap().renderList.push(vaz);
						shadowGenerator.addShadowCaster(vaz);
						
						// shadowGenerator.getShadowMap().renderList.push(vaz);
						// vaz.receiveShadows = true;
						vaz.rotate(BABYLON.Axis.Y, 3*Math.PI/2, BABYLON.Space.LOCAL);
						// vaz.physicsImpostor = new BABYLON.PhysicsImpostor(vaz, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5, restitution: 0.7 });
					}
				}); 
				// mesh = vaz;
				// chassisMesh = vaz;
            },
        )
		// BABYLON.SceneLoader.ImportMesh(
		// 	null,
        //     'models/',
        //     'lada_2106.glb',
        //     scene,
        //     (meshArray)=>{
		// 		vaz2 = meshArray[0];
		// 		// box.translate(BABYLON.Axis.X, 10, BABYLON.Space.LOCAL);
		// 		box = new BABYLON.MeshBuilder.CreateBox("box", {width: 2, depth: 2, height: 2});
		// 		// box.position = new BABYLON.Vector3(0, 5, 0);
		// 		box.translate(BABYLON.Axis.X, 10, BABYLON.Space.LOCAL);
		// 		box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 50, friction: 0.5, restitution: 0.7 });
		// 		// meshArray[1].position = new BABYLON.Vector3(0, 0, 20);
		// 		shadowGenerator.getShadowMap().renderList.push(vaz);
		// 		shadowGenerator.addShadowCaster(vaz);
				
		// 		// shadowGenerator.getShadowMap().renderList.push(vaz);
		// 		vaz.receiveShadows = true;
		// 	},
		// );

		return scene;
	};

	function createVehicle(scene, pos, quat, car) {
		//Going Native
		var physicsWorld = scene.getPhysicsEngine().getPhysicsPlugin().world;
				
		//create the ammo.js vehicle geometry to match our chassis size
		var geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * .5, chassisHeight * .5, chassisLength * .5));
		
		//create the transform for the vehicle 
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(0,5,0));
		transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
		var motionState = new Ammo.btDefaultMotionState(transform);		
		
		//create the local inertia of the vehicle based on its mass
		var localInertia = new Ammo.btVector3(0, 0, 0);		
		geometry.calculateLocalInertia(massVehicle, localInertia);
		
		//create the chassis mesh
		createChassisMesh(scene, chassisWidth, chassisHeight, chassisLength, car);
		
		//
		var massOffset = new Ammo.btVector3( 0, 0.4, 0);
		var transform2 = new Ammo.btTransform();
		transform2.setIdentity();
		transform2.setOrigin(massOffset);
		
		//create the rigidbody to match our car chassis
		var compound = new Ammo.btCompoundShape();
		compound.addChildShape( transform2, geometry );		
		var body = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(massVehicle, motionState, compound, localInertia));
		body.setActivationState(4);
		
		//add our rigidbody to the physics world
		physicsWorld.addRigidBody(body);
					
		//setup a raycaster to control the car placement
		var tuning = new Ammo.btVehicleTuning();
		var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
		vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
		vehicle.setCoordinateSystem(0, 1, 2);
		
		//add vehicle to the physics world
		physicsWorld.addAction(vehicle);
		
		//get the chassis world transform
		var trans = vehicle.getChassisWorldTransform();
		
		//creates one wheel with physics properties
		function addWheel(isFront, pos, radius, width, index) 
		{				
			var wheelInfo = vehicle.addWheel(
				pos,
				wheelDirectionCS0,
				wheelAxleCS,
				suspensionRestLength,
				radius,
				tuning,
				isFront);

			wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
			wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
			wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
			wheelInfo.set_m_maxSuspensionForce(600000);
			wheelInfo.set_m_frictionSlip(40);
			wheelInfo.set_m_rollInfluence(rollInfluence);

			wheelMeshes[index] = createWheelMesh(radius, width);
		}

		//add the wheels
		addWheel(true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
		addWheel(true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
		addWheel(false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
		addWheel(false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

		vehicleReady = true; 
	}	

	//this function creates the car chassis and its corresponding lights including brake and reverse lights.
	function createChassisMesh(scene, w, l, h, car) 
	{
		//we create a car follow camera to keep following our car.
		var camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, 10));
		camera.radius = 10;
		camera.heightOffset = 4;
		camera.rotationOffset = 180; //this value rotates the follow camera. To get a side on view set this value to -90 or 90
		camera.cameraAcceleration = 0.05;
		camera.maxCameraSpeed = 400;
		camera.attachControl(canvas, true);
		camera.lockedTarget = car; //version 2.5 onwards
		 
		//make this as the active scene camera
		scene.activeCamera = camera;

		//debug view of axes
		/*const axes = new BABYLON.AxesViewer(scene, 2);
		axes.xAxis.parent = mesh;
		axes.yAxis.parent = mesh;
		axes.zAxis.parent = mesh;*/
		
		// return mesh;
	}
			

	//this function creates the wheel mesh based on the getting started village tutorial
	function createWheelMesh(radius, width) 
	{			 
		//create our wheel mesh using a cylinder
		var mesh = new BABYLON.MeshBuilder.CreateCylinder("Wheel", {diameter:1, height:0.5,  faceUV: wheelUV});// tessellation: 6});
		mesh.rotationQuaternion = new BABYLON.Quaternion();
		
		//assign the wheel material which is created in createScene function on initialization
		mesh.material = wheelMaterial;

		//cylinder is oriented in XZ plane, we want our wheels to be oriented in XY plane
		mesh.rotate(BABYLON.Axis.Z, Math.PI/2);
		
		//in order to prevent doing this tranformation every frame, we bake the transform into vertices
		mesh.bakeCurrentTransformIntoVertices();
		
		return mesh;
	}

	//key up event handler
	function keyup(e) {
		if(keysActions[e.code]) {
			actions[keysActions[e.code]] = false; 
		}
	}

	//key down event handler
	function keydown(e) {
		if(keysActions[e.code]) {
			actions[keysActions[e.code]] = true; 
		}
	}           

	window.initFunction = async function() {
		var asyncEngineCreation = async function() {
			try {
				return createDefaultEngine();
			} catch(e) {
				console.log("the available createEngine function failed. Creating the default engine instead");
				return createDefaultEngine();
			}
		}

		window.engine = await asyncEngineCreation();
		if (!engine) throw 'engine should not be null.';
		startRenderLoop(engine, canvas);
		window.scene = createScene();
	};
	initFunction().then(() => {
		scene.then(returnedScene => { sceneToRender = returnedScene; });
	});

    // Resize
    window.addEventListener("resize", function () {
        engine.resize();
    });

