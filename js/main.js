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

		var wheelAxisPositionBack = -1.8;
		var wheelRadiusBack = .4;
		var wheelWidthBack = .3;
		var wheelHalfTrackBack = 1.2;
		var wheelAxisHeightBack = 0.4;

		var wheelAxisFrontPosition = 2.2;
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

		scene.debugLayer.show({
			embedMode: true,
		});
		
		//we create our car follow camera in createChassisMesh function
		var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10));
		camera.setTarget(BABYLON.Vector3.Zero());
		camera.attachControl(canvas, true);
		
		//create our light
		var light = new BABYLON.PointLight("light2", new BABYLON.Vector3(-10, 10, 0));
		// light2.specular = new BABYLON.Color3(0, 0, 0);
		// light2.intensity = 500.7;
		// light2.lightmapMode = BABYLON.Light.LIGHTMAP_SPECULAR;
		// var shadowGenerator = new BABYLON.ShadowGenerator(1024, light2);

		// var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0));
		// var light = new BABYLON.PointLight("light1", new BABYLON.Vector3(10, 10, 0));
		// var light = new BABYLON.DirectionalLight("light1", new BABYLON.Vector3(-10, -10, 0), scene);
		// var light = new BABYLON.SpotLight("spotLight", new BABYLON.Vector3(10, 10, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 2, scene);
		// light.transformedDirection = new BABYLON.Vector3(90, 0, 0);
		// light.range = 100;
		// light.lightmapMode = BABYLON.Light.LIGHTMAP_SPECULAR;
		light.specular = new BABYLON.Color3(0, 0, 0);
		light.intensity = 1;
		light.groundColor = new BABYLON.Color3(1, 1, 1);

		var shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
		// shadowGenerator.useBlurExponentialShadowMap = true;

		const axes = new BABYLON.AxesViewer(scene, 2);
		axes.xAxis.parent = light;
		axes.yAxis.parent = light;
		axes.zAxis.parent = light;


		//we create some materials for our obstacles
		redMaterial = new BABYLON.StandardMaterial("RedMaterial");
		redMaterial.diffuseColor = new BABYLON.Color3(0.8,0.4,0.5);
		redMaterial.emissiveColor = new BABYLON.Color3(0.8,0.4,0.5);
		redMaterial.diffuseTexture = new BABYLON.Texture("/models/texture/tex_u1_v1_diffuse.jpg");
		redMaterial.emissiveTexture = new BABYLON.Texture("/models/textures/tex_u1_v1_baseColor.jpeg");
		// redMaterial.diffuseTexture = new BABYLON.Texture("/models/Texture.png");
		// redMaterial.emissiveTexture = new BABYLON.Texture("/models/Texture.png");

		blueMaterial = new BABYLON.StandardMaterial("RedMaterial");
		blueMaterial.diffuseColor = new BABYLON.Color3(0.5,0.4,0.8);
		blueMaterial.emissiveColor = new BABYLON.Color3(0.5,0.4,0.8);
		blueMaterial.diffuseTexture = new BABYLON.Texture("/models/texture/tex_u1_v1_diffuse.jpg");
		blueMaterial.emissiveTexture = new BABYLON.Texture("/models/textures/tex_u1_v1_baseColor.jpeg");

		greenMaterial = new BABYLON.StandardMaterial("RedMaterial");
		greenMaterial.diffuseColor = new BABYLON.Color3(0.5,0.8,0.5);
		greenMaterial.emissiveColor = new BABYLON.Color3(0.5,0.8,0.5);
		// greenMaterial.diffuseTexture = new BABYLON.Texture("/models/texture/tex_u1_v1_diffuse.jpg");
		// greenMaterial.emissiveTexture = new BABYLON.Texture("/models/textures/tex_u1_v1_baseColor.jpeg");
	
		//load our wheel material
		wheelMaterial = new BABYLON.StandardMaterial("WheelMaterial"); 
		wheelMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/wheel.png");
		
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
		// var ground = BABYLON.Mesh.CreateGround("ground", 460, 460, 2);
		// ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 });
		// ground.material = new BABYLON.GridMaterial("groundMaterial");
		let ground = new BABYLON.MeshBuilder.CreateBox('box', {
			width: 460,
			depth: 460,
			height: 0.5
		}, scene);
		matGround  = new BABYLON.StandardMaterial("material", scene); 
		matGround.alpha = 0.7;
		ground.material = matGround; 
		// ground.translate(BABYLON.Axis.Y, -2, BABYLON.Space.WORLD);

		
		ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 });
		// ground.receiveShadows = true;

		//create obstacles
		createObstacle(new BABYLON.Vector3(4,1,12),new BABYLON.Vector3(0,0,25),new BABYLON.Vector3(-Math.PI/8,0,0),0);
		createObstacle(new BABYLON.Vector3(4,1,12),new BABYLON.Vector3(25,0,0),new BABYLON.Vector3(-Math.PI/8,Math.PI/2,0),0);
		createObstacle(new BABYLON.Vector3(4,1,12),new BABYLON.Vector3(0,0,-25),new BABYLON.Vector3(Math.PI/8,0,0),0);
		createObstacle(new BABYLON.Vector3(4,1,12),new BABYLON.Vector3(-25,0,0),new BABYLON.Vector3(Math.PI/8,Math.PI/2,0),0);
	   
		//we randomize the creation of obstacles by making boxes of arbitrary size and orientation
		let s = new BABYLON.Vector3();
		let p = new BABYLON.Vector3();
		let r = new BABYLON.Vector3();
		for(let i=0;i<20;i++){
			let m = Math.random()*300-150+5;
			let m3 = Math.random()*300-150+5;
			let m2 = Math.random()*10;
			s.set(m2,m2,m2);
			p.set(m3,0,m);
			r.set(m,m,m);
			let as = createObstacle(s,p,r,0);

			as.receiveShadows = true;
			shadowGenerator.addShadowCaster(as);
		}

		//we randomize some more obstacles by making boxes of arbitrary size and orientation
		for(let i=0;i<30;i++){
			let m = Math.random()*300-150+5;
			let m3 = Math.random()*300-150+5;
			let m2 = Math.random()*3;
			s.set(m2,m2,m2);
			p.set(m3,0,m);
			r.set(m,m,m);
			let as = createObstacle(s,p,r,5);

			as.receiveShadows = true;
			shadowGenerator.addShadowCaster(as);
		}

		//load the pink spiral ramp mesh
		loadTriangleMesh(scene);

		//create our car
		// createVehicle(scene, new BABYLON.Vector3(0, 4, -20), ZERO_QUATERNION);

		scene.clearColor = new BABYLON.Color3.FromHexString("#0099ff");
		scene.ambientColor = BABYLON.Color3.White();

		BABYLON.SceneLoader.ImportMesh(
            null,
            'models/',
            'map.glb',
            scene,
            (meshArray)=>{
                let map = meshArray[0];
				console.log(meshArray);
				map.position.y = 1;
				map.position.x = 2;

				// map.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/wheel.png");
				
				const axes = new BABYLON.AxesViewer(scene, 2);
				axes.xAxis.parent = map;
				axes.yAxis.parent = map;
				axes.zAxis.parent = map;

				// map.receiveShadows = true;

				map.physicsImpostor = new BABYLON.PhysicsImpostor(
					map, 
					BABYLON.PhysicsImpostor.BoxImpostor, 
					{ 
						mass: 0, 
						friction: 0.5, 
						restitution: 0.7 
					}
				);
				map.receiveShadows = true;
				// shadowGenerator.addShadowCaster(map);
			}
		);

		BABYLON.SceneLoader.ImportMesh(
            null,
            'models/',
            'serp_molot.babylon',
            scene,
            (meshArray)=>{
                let serp_molot = meshArray[0];
				serp_molot.position.y = 2;
				serp_molot.position.z = 15;
				serp_molot.rotate(BABYLON.Axis.Y, Math.PI/3, BABYLON.Space.LOCAL);
				serp_molot.rotate(BABYLON.Axis.Z, Math.PI/3, BABYLON.Space.LOCAL);
				// serp_molot.position.x = 2;
				// serp_molot.translate(BABYLON.Axis.Y, 2, BABYLON.Space.LOCAL);

				serp_molot.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/wheel.png");
				
				const axes = new BABYLON.AxesViewer(scene, 2);
				axes.xAxis.parent = serp_molot;
				axes.yAxis.parent = serp_molot;
				axes.zAxis.parent = serp_molot;

				// serp_molot.receiveShadows = true;

				serp_molot.physicsImpostor = new BABYLON.PhysicsImpostor(
					serp_molot, 
					BABYLON.PhysicsImpostor.BoxImpostor, 
					{ 
						mass: 0, 
						friction: 0.5, 
						restitution: 0.7 
					}
				);
				shadowGenerator.addShadowCaster(serp_molot);
			}
		);

		// var vaz = 0;
		var checkVaz = false;
		chassisMesh = 0;
		//create our car
		BABYLON.SceneLoader.ImportMesh(
            null,
            'models/',
            'lada_2106.glb',
            scene,
            (meshArray)=>{
                chassisMesh = meshArray[0];
				
				const axes = new BABYLON.AxesViewer(scene, 2);
				axes.xAxis.parent = chassisMesh;
				axes.yAxis.parent = chassisMesh;
				axes.zAxis.parent = chassisMesh;

				chassisMesh.scaling = new BABYLON.Vector3(0.45,0.45,0.45);
				shadowGenerator.addShadowCaster(chassisMesh);
			}
		);
		
		//attach key event handlers
		window.addEventListener( 'keydown', keydown);
		window.addEventListener( 'keyup', keyup);

		var time = 0;
		
		//register prerender callback to initiate 
		scene.registerBeforeRender(function(){
			if(chassisMesh != 0 && !checkVaz){
				checkVaz = true
				createVehicle(scene, new BABYLON.Vector3(0, 4, -20), ZERO_QUATERNION);

				// chassisMesh.rotate(BABYLON.Axis.Z, 3*Math.PI/2, BABYLON.Space.LOCAL);
				// chassisMesh.position.y = 10;
			}

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
				chassisMesh.position.set(p.x(), p.y(), p.z()); 
				chassisMesh.rotationQuaternion.set(q.x(), q.y(), q.z(), q.w());  
				
				chassisMesh.translate(BABYLON.Axis.Y, 1.8, BABYLON.Space.LOCAL);
				// chassisMesh.translate(BABYLON.Axis.X, -1.8, BABYLON.Space.LOCAL);
				// chassisMesh.rotate(BABYLON.Axis.Y, 3*Math.PI/2, BABYLON.Space.LOCAL);
			} 
		}); 

		return scene;
	};

	function loadTriangleMesh(scene){
		var physicsWorld = scene.getPhysicsEngine().getPhysicsPlugin().world;
		BABYLON.SceneLoader.ImportMesh("Loft001", "https://raw.githubusercontent.com/RaggarDK/Baby/baby/", "ramp.babylon", scene, function (newMeshes) {
			for(let x=0;x<newMeshes.length;x++){
				let mesh = newMeshes[x];
				mesh.position.y -= 2.5;
				mesh.material = redMaterial;
				let positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
				let normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
				let colors = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind);
				let uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
				let indices = mesh.getIndices();
							
				mesh.updateFacetData();
				var localPositions = mesh.getFacetLocalPositions(); 
				var triangleCount = localPositions.length;
							
				let mTriMesh = new Ammo.btTriangleMesh();
				let removeDuplicateVertices = true;
				let tmpPos1 = new Ammo.btVector3(0,0,0);
				let tmpPos2 = new Ammo.btVector3(0,0,0);
				let tmpPos3 = new Ammo.btVector3(0,0,0);
							
				var _g = 0;
				while(_g < triangleCount) {
					var i = _g++;
					var index0 = indices[i * 3];
					var index1 = indices[i * 3 + 1];
					var index2 = indices[i * 3 + 2];
					var vertex0 = new Ammo.btVector3(positions[index0 * 3],positions[index0 * 3 + 1],positions[index0 * 3 + 2]);
					var vertex1 = new Ammo.btVector3(positions[index1 * 3],positions[index1 * 3 + 1],positions[index1 * 3 + 2]);
					var vertex2 = new Ammo.btVector3(positions[index2 * 3],positions[index2 * 3 + 1],positions[index2 * 3 + 2]);
					mTriMesh.addTriangle(vertex0,vertex1,vertex2);
				}
										
				let shape = new Ammo.btBvhTriangleMeshShape( mTriMesh, true, true );
				let localInertia = new Ammo.btVector3(0, 0, 0);
				let transform = new Ammo.btTransform;

				transform.setIdentity();
				transform.setOrigin(new Ammo.btVector3(mesh.position.x,mesh.position.y,mesh.position.z));
				transform.setRotation(new Ammo.btQuaternion(
				mesh.rotationQuaternion.x , mesh.rotationQuaternion.y , mesh.rotationQuaternion.z, mesh.rotationQuaternion.w));
						
				let motionState = new Ammo.btDefaultMotionState(transform);
				let rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
				let body = new Ammo.btRigidBody(rbInfo);
				physicsWorld.addRigidBody(body);

				mesh.receiveShadows = true;
				// shadowGenerator.addShadowCaster(mesh);
			}
		});			
	}

	//this function create an arbitrary sized box as an obstacle
	function createObstacle(size, position, rotation, mass){

		var box = new BABYLON.MeshBuilder.CreateBox("box", {width:size.x, depth:size.z, height:size.y});
		box.position.set(position.x,position.y,position.z);
		box.rotation.set(rotation.x,rotation.y,rotation.z);
		if(!mass){
			mass = 0;
			box.material = redMaterial;
		} else {
			box.position.y += 5;
			box.material = blueMaterial;

		}
		box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: mass, friction: 0.5, restitution: 0.7 });
		
		return box;
		// box.receiveShadows = true;
		// shadowGenerator.addShadowCaster(box);
	}


	function createVehicle(scene, pos, quat) {
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
		createChassisMesh(scene, chassisWidth, chassisHeight, chassisLength);
		
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
	function createChassisMesh(scene, w, l, h) 
	{
		mesh = chassisMesh;
		//we create a car follow camera to keep following our car.
		var camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, 10));
		camera.radius = 10;
		camera.heightOffset = 4;
		camera.rotationOffset = 180; //this value rotates the follow camera. To get a side on view set this value to -90 or 90
		camera.cameraAcceleration = 0.05;
		camera.maxCameraSpeed = 400;
		camera.attachControl(canvas, true);
		camera.lockedTarget = mesh; //version 2.5 onwards
		 
		//make this as the active scene camera
		scene.activeCamera = camera;

		//debug view of axes
		/*const axes = new BABYLON.AxesViewer(scene, 2);
		axes.xAxis.parent = mesh;
		axes.yAxis.parent = mesh;
		axes.zAxis.parent = mesh;*/
		
		return mesh;
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
	initFunction().then(
		() => {
			scene.then(returnedScene => { sceneToRender = returnedScene; });

			
		}
	);

    // Resize
    window.addEventListener("resize", function () {
        engine.resize();
    });
