/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var WWParallels = function ( elementToBindTo ) {
	this.renderer = null;
	this.canvas = elementToBindTo;
	this.aspectRatio = 1;
	this.recalcAspectRatio();

	this.scene = null;
	this.cameraDefaults = {
		posCamera: new THREE.Vector3( 0.0, 175.0, 500.0 ),
		posCameraTarget: new THREE.Vector3( 0, 0, 0 ),
		near: 0.1,
		far: 10000,
		fov: 45
	};
	this.camera = null;
	this.cameraTarget = this.cameraDefaults.posCameraTarget;

	this.workerDirector = new THREE.LoaderSupport.WorkerDirector( THREE.OBJLoader2 );
	this.logging = {
		enabled: false,
		debug: false
	};
	this.workerDirector.setLogging( this.logging.enabled, this.logging.debug );
	this.workerDirector.setCrossOrigin( 'anonymous' );
	this.workerDirector.setForceWorkerDataCopy( true );

	this.controls = null;
	this.cube = null;

	this.allAssets = [];
	this.feedbackArray = null;

	this.running = false;
};

WWParallels.prototype = {

	constructor: WWParallels,

	initGL: function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x050505 );

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera( this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far );
		this.resetCamera();
		this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scene.add( directionalLight1 );
		this.scene.add( directionalLight2 );
		this.scene.add( ambientLight );

		var geometry = new THREE.BoxBufferGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );
	},

	resizeDisplayGL: function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	},

	recalcAspectRatio: function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	},

	resetCamera: function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	},

	updateCamera: function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	},

	render: function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	},

	_reportProgress: function( content ) {
		var output = content;
		if ( THREE.LoaderSupport.Validator.isValid( content ) && THREE.LoaderSupport.Validator.isValid( content.detail ) ) output = content.detail.text;

		output = THREE.LoaderSupport.Validator.verifyInput( output, '' );
		if ( this.logging.enabled ) console.info( 'Progress:\n\t' + output.replace(/\<br\>/g, '\n\t' ) );
		document.getElementById( 'feedback' ).innerHTML = output;
	},

	enqueueAllAssests: function ( maxQueueSize, maxWebWorkers, streamMeshes ) {
		if ( this.running ) {

			return;

		} else {

			this.running = true;

		}

		var scope = this;
		scope.workerDirector.objectsCompleted = 0;
		scope.feedbackArray = [];
		scope.reportDonwload = [];

		var i;
		for ( i = 0; i < maxWebWorkers; i++ ) {

			scope.feedbackArray[ i ] = 'Worker #' + i + ': Awaiting feedback';
			scope.reportDonwload[ i ] = true;

		}
		scope._reportProgress( scope.feedbackArray.join( '\<br\>' ) );

		var callbackOnLoad = function ( event ) {
			var instanceNo = event.detail.instanceNo;
			scope.reportDonwload[ instanceNo ] = false;
			scope.allAssets.push( event.detail.loaderRootNode );

			var msg = 'Worker #' + instanceNo + ': Completed loading: ' + event.detail.modelName + ' (#' + scope.workerDirector.objectsCompleted + ')';
			if ( scope.logging.enabled ) console.info( msg );
			scope.feedbackArray[ instanceNo ] = msg;
			scope._reportProgress( scope.feedbackArray.join( '\<br\>' ) );

			if ( scope.workerDirector.objectsCompleted + 1 === maxQueueSize ) scope.running = false;
		};

		var callbackReportProgress = function ( event ) {
			var	instanceNo = event.detail.instanceNo;
			var text = event.detail.text;

			if ( scope.reportDonwload[ instanceNo ] ) {
				var msg = 'Worker #' + instanceNo + ': ' + text;
				if ( scope.logging.enabled ) console.info( msg );

				scope.feedbackArray[ instanceNo ] = msg;
				scope._reportProgress( scope.feedbackArray.join( '\<br\>' ) );
			}
		};

		var callbackReportError = function ( supportDesc, errorMessage ) {

			console.error( 'LoaderWorkerDirector reported an error: ' );
			console.error( errorMessage );
			return true;

		};

		var callbackMeshAlter = function ( event, override ) {
			if ( ! THREE.LoaderSupport.Validator.isValid( override ) ) override = new THREE.LoaderSupport.LoadedMeshUserOverride( false, false );

			var material = event.detail.material;
			var meshName = event.detail.meshName;
			if ( THREE.LoaderSupport.Validator.isValid( material ) && material.name === 'defaultMaterial' || meshName === 'Mesh_Mesh_head_geo.001_lambert2SG.001' ) {

				var materialOverride = material;
				materialOverride.color = new THREE.Color( Math.random(), Math.random(), Math.random() );
				var mesh = new THREE.Mesh( event.detail.bufferGeometry, material );
				mesh.name = meshName;

				override.addMesh( mesh );
				override.alteredMesh = true;

			}
			return override;
		};

		var callbackOnLoadMaterials = function ( materials ) {
			console.log( 'Materials loaded' );
			return materials;
		};

		var callbacks = new THREE.LoaderSupport.Callbacks();
		callbacks.setCallbackOnProgress( callbackReportProgress );
		callbacks.setCallbackOnReportError( callbackReportError );
		callbacks.setCallbackOnLoad( callbackOnLoad );
		callbacks.setCallbackOnMeshAlter( callbackMeshAlter );
		callbacks.setCallbackOnLoadMaterials( callbackOnLoadMaterials );

		this.workerDirector.prepareWorkers( callbacks, maxQueueSize, maxWebWorkers );
		if ( this.logging.enabled ) console.info( 'Configuring WWManager with queue size ' + this.workerDirector.getMaxQueueSize() + ' and ' + this.workerDirector.getMaxWebWorkers() + ' workers.' );

		var prepData;
		var modelPrepDatas = [];
		prepData = new THREE.LoaderSupport.PrepData( 'male02' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.obj', 'OBJ ') );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/male02/male02.mtl', 'MTL' ) );
		prepData.setLogging( false, false );
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'female02' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/female02/female02.mtl', 'MTL' ) );
		prepData.setLogging( false, false );
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'viveController' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/vive-controller/vr_controller_vive_1_5.obj', 'OBJ' ) );
		prepData.setLogging( false, false );
		prepData.scale = 400.0;
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'cerberus' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/cerberus/Cerberus.obj', 'OBJ' ) );
		prepData.setLogging( false, false );
		prepData.scale = 50.0;
		modelPrepDatas.push( prepData );

		prepData = new THREE.LoaderSupport.PrepData( 'WaltHead' );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.obj', 'OBJ' ) );
		prepData.addResource( new THREE.LoaderSupport.ResourceDescriptor( '../../resource/obj/walt/WaltHead.mtl', 'MTL' ) );
		prepData.setLogging( false, false );
		modelPrepDatas.push( prepData );

		var pivot;
		var distributionBase = -500;
		var distributionMax = 1000;
		var modelPrepDataIndex = 0;
		var modelPrepData;
		var scale;
		for ( i = 0; i < maxQueueSize; i++ ) {

			modelPrepDataIndex = Math.floor( Math.random() * modelPrepDatas.length );

			modelPrepData = modelPrepDatas[ modelPrepDataIndex ];
			modelPrepData.useAsync = true;
			scale = THREE.LoaderSupport.Validator.verifyInput( modelPrepData.scale, 0 );
			modelPrepData = modelPrepData.clone();

			pivot = new THREE.Object3D();
			pivot.position.set(
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random(),
				distributionBase + distributionMax * Math.random()
			);
			if ( scale > 0 ) pivot.scale.set( scale, scale, scale );
			this.scene.add( pivot );
			modelPrepData.streamMeshesTo = pivot;

			this.workerDirector.enqueueForRun( modelPrepData );
		}
		this.workerDirector.processQueue();
	},

	clearAllAssests: function () {
		var storedObject3d;
		for ( var asset in this.allAssets ) {

			storedObject3d = this.allAssets[ asset ];
			var scope = this;
			var remover = function ( object3d ) {

				if ( storedObject3d === object3d ) return;

				if ( scope.logging.enabled ) console.info( 'Removing ' + object3d.name );
				scope.scene.remove( object3d );

				if ( object3d.hasOwnProperty( 'geometry' ) ) object3d.geometry.dispose();
				if ( object3d.hasOwnProperty( 'material' ) ) {

					var mat = object3d.material;
					if ( mat.hasOwnProperty( 'materials' ) ) {

						var materials = mat.materials;
						for ( var name in materials ) {

							if ( materials.hasOwnProperty( name ) ) materials[ name ].dispose();

						}
					}
				}
				if ( object3d.hasOwnProperty( 'texture' ) )	object3d.texture.dispose();
			};
			if ( THREE.LoaderSupport.Validator.isValid( storedObject3d ) ) {

				if ( this.pivot !== storedObject3d ) scope.scene.remove( storedObject3d );
				storedObject3d.traverse( remover );
				storedObject3d = null;

			}
		}
		this.allAssets = [];
	},

	terminateManager: function () {
		this.workerDirector.tearDown();
		this.running = false;
	},

	terminateManagerAndClearScene: function () {
		var scope = this;
		var scopedClearAllAssests = function (){
			scope.clearAllAssests();
		};
		if ( this.workerDirector.isRunning() ) {

			this.workerDirector.tearDown( scopedClearAllAssests );

		} else {

			scopedClearAllAssests();
		}

		this.running = false;
	}

};
