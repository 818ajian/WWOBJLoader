if ( THREE.LoaderSupport === undefined ) { THREE.LoaderSupport = {} }

/**
 * Validation functions
 * @class
 */
THREE.LoaderSupport.Validator = {
	/**
	 * If given input is null or undefined, false is returned otherwise true.
	 *
	 * @param input Anything
	 * @returns {boolean}
	 */
	isValid: function( input ) {
		return ( input !== null && input !== undefined );
	},
	/**
	 * If given input is null or undefined, the defaultValue is returned otherwise the given input.
	 *
	 * @param input Anything
	 * @param defaultValue Anything
	 * @returns {*}
	 */
	verifyInput: function( input, defaultValue ) {
		return ( input === null || input === undefined ) ? defaultValue : input;
	}
};


/**
 * Callbacks utilized by functions working with WWLoader implementations
 * @class
 */
THREE.LoaderSupport.Callbacks = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Callbacks() {
	}

	/**
	 * Register callback function that is invoked by internal function "announceProgress" to print feedback.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnProgress Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnProgress = function ( callbackOnProgress ) {
		this.onProgress = Validator.verifyInput( callbackOnProgress, this.onProgress );
	};

	/**
	 * Register callback function that is called once loading of the complete model is completed.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnLoad Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnLoad = function ( callbackOnLoad ) {
		this.onLoad = Validator.verifyInput( callbackOnLoad, this.onLoad );
	};

	/**
	 * Register callback function that is called every time a mesh was loaded.
	 * Use {@link THREE.LoaderSupport.LoadedMeshUserOverride} for alteration instructions (geometry, material or disregard mesh).
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnMeshLoaded Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnMeshLoaded = function ( callbackOnMeshLoaded ) {
		this.onMeshLoaded = Validator.verifyInput( callbackOnMeshLoaded, this.onMeshLoaded );
	};

	/**
	 * Report if an error prevented loading.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 *
	 * @param {callback} callbackOnError Callback function for described functionality
	 */
	Callbacks.prototype.setCallbackOnError = function ( callbackOnError ) {
		this.onError = Validator.verifyInput( callbackOnError, this.onError );
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.LoaderSupport.Callbacks
	 */
	Callbacks.prototype.clearAllCallbacks = function () {
		this.onProgress = null;
		this.onLoad = null;
		this.onError = null;
		this.onMeshLoaded = null;
	};

	return Callbacks;
})();


/**
 * Global callback definition
 * @class
 */
THREE.LoaderSupport.Commons = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function Commons( manager ) {
		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );
	}

	Commons.prototype.init = function ( manager ) {
		this.manager = Validator.verifyInput( manager, this.manager );
		this.manager = Validator.verifyInput( this.manager, THREE.DefaultLoadingManager );

		this.modelName = '';

		this.debug = false;
		this.sceneGraphBaseNode = null;
		this.materials = [];
		this.materialNames = [];

		this.streamMeshes = false;
		this.meshStore = [];

		this.callbacks = new THREE.LoaderSupport.Callbacks();
	};


	Commons.prototype._applyPrepData = function ( prepData ) {
		this.modelName = Validator.verifyInput( Validator.isValid( prepData ) ? prepData.modelName : null, this.modelName );
		this.setSceneGraphBaseNode( prepData.sceneGraphBaseNode );
		var materials = Validator.isValid( prepData ) ? ( prepData.materials.length > 0 ? prepData.materials : null ) : null;
		setMaterials( this, materials );
	};

	/**
	 * Allows to set debug mode.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {boolean} enabled
	 */
	Commons.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	/**
	 * Set the node where the loaded objects will be attached.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode scenegraph object where meshes will be attached
	 */
	Commons.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, this.sceneGraphBaseNode );
		this.sceneGraphBaseNode = Validator.verifyInput( this.sceneGraphBaseNode, new THREE.Group() );
	};

	Commons.prototype.setStreamMeshes = function ( streamMeshes ) {
		this.streamMeshes = streamMeshes !== false;
		if ( ! this.streamMeshes ) this.meshStore = [];
	};

	var setMaterials = function ( scope, materials ) {
		if ( Validator.isValid( materials ) && Object.keys( materials ).length > 0 ) {
			scope.materials = materials;

			scope.materialNames = [];
			for ( var materialName in materials ) {
				scope.materialNames.push( materialName );
			}
		}

		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		if ( ! Validator.isValid( scope.materials[ defaultMaterial ] ) ) {
			scope.materials[ defaultMaterial.name ] = defaultMaterial;
		}
		scope.materialNames.push( defaultMaterial.name );

		var vertexColorMaterial = new THREE.MeshBasicMaterial( { color: 0xDCF1FF } );
		vertexColorMaterial.name = 'vertexColorMaterial';
		vertexColorMaterial.vertexColors = THREE.VertexColors;
		if ( ! Validator.isValid( scope.materials[ vertexColorMaterial.name ] ) ) {
			scope.materials[ vertexColorMaterial.name ] = vertexColorMaterial;
		}
		scope.materialNames.push( vertexColorMaterial.name );
	};

	/**
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	Commons.prototype.setMaterials = function ( materials ) {
		setMaterials( this, materials );
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	Commons.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Clears all registered callbacks.
	 * @memberOf THREE.LoaderSupport.Commons
	 */
	Commons.prototype.clearAllCallbacks = function () {
		this.callbacks.clearAllCallbacks();
	};

	/**
	 * Announce feedback which is give to the registered callbacks and logged if debug is enabled
	 * @memberOf THREE.LoaderSupport.Commons
	 *
	 * @param baseText
	 * @param text
	 */
	Commons.prototype.onProgress = function ( baseText, text ) {
		var content = Validator.isValid( baseText ) ? baseText: '';
		content = Validator.isValid( text ) ? content + ' ' + text : content;

		var callbackOnProgress = this.callbacks.onProgress;
		if ( Validator.isValid( callbackOnProgress ) ) callbackOnProgress( content, this.modelName );

		if ( this.debug ) console.log( content );
	};

	Commons.prototype.builder = function ( payload ) {
		var meshName = payload.params.meshName;

		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.buffers.vertices ), 3 ) );
		var haveVertexColors = Validator.isValid( payload.buffers.colors );
		if ( haveVertexColors ) {

			bufferGeometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( payload.buffers.colors ), 3 ) );

		}
		if ( Validator.isValid( payload.buffers.normals ) ) {

			bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}
		if ( Validator.isValid( payload.buffers.uvs ) ) {

			bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.buffers.uvs ), 2 ) );

		}

		var materialDescriptions = payload.materials.materialDescriptions;
		var materialDescription;
		var material;
		var materialName;
		var createMultiMaterial = payload.materials.multiMaterial;
		var multiMaterials = [];

		var key;
		for ( key in materialDescriptions ) {

			materialDescription = materialDescriptions[ key ];
			material = this.materials[ materialDescription.name ];
			material = haveVertexColors ? this.materials[ 'vertexColorMaterial' ] : this.materials[ materialDescription.name ];
			if ( ! material ) material = this.materials[ 'defaultMaterial' ];

			if ( materialDescription.default ) {

				material = this.materials[ 'defaultMaterial' ];

			} else if ( materialDescription.flat ) {

				materialName = material.name + '_flat';
				var materialClone = this.materials[ materialName ];
				if ( ! materialClone ) {

					materialClone = material.clone();
					materialClone.name = materialName;
					materialClone.shading = THREE.FlatShading;
					this.materials[ materialName ] = name;

				}

			}

			if ( materialDescription.vertexColors ) material.vertexColors = THREE.VertexColors;
			if ( createMultiMaterial ) multiMaterials.push( material );

		}
		if ( createMultiMaterial ) {

			material = multiMaterials;
			var materialGroups = payload.materials.materialGroups;
			var materialGroup;
			for ( key in materialGroups ) {

				materialGroup = materialGroups[ key ];
				bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

			}

		}

		var meshes = [];
		var mesh;
		var callbackOnMeshLoaded = this.callbacks.onMeshLoaded;
		var callbackOnMeshLoadedResult;
		if ( Validator.isValid( callbackOnMeshLoaded ) ) {

			callbackOnMeshLoadedResult = callbackOnMeshLoaded( meshName, bufferGeometry, material );
			if ( Validator.isValid( callbackOnMeshLoadedResult ) && ! callbackOnMeshLoadedResult.isDisregardMesh() ) {

				if ( callbackOnMeshLoadedResult.providesAlteredMeshes() ) {

					for ( var i in callbackOnMeshLoadedResult.meshes ) {

						meshes.push( callbackOnMeshLoadedResult.meshes[ i ] );

					}

				} else {

					mesh = new THREE.Mesh( bufferGeometry, material );
					mesh.name = meshName;
					meshes.push( mesh );

				}

			} else {

				mesh = new THREE.Mesh( bufferGeometry, material );
				mesh.name = meshName;
				meshes.push( mesh );

			}

		} else {

			mesh = new THREE.Mesh( bufferGeometry, material );
			mesh.name = meshName;
			meshes.push( mesh );

		}
		if ( Validator.isValid( meshes ) && meshes.length > 0 ) {

			var meshNames = [];
			for ( var i in meshes ) {

				mesh = meshes[ i ];
				if ( this.streamMeshes ) {

					this.sceneGraphBaseNode.add( mesh );

				} else {

					this.meshStore.push( mesh );

				}
				meshNames[ i ] = mesh.name;

			}
			this.callbacks.onProgress( 'Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName );

		} else {

			this.callbacks.onProgress(  'Not adding mesh: ' + meshName );

		}
	};

	Commons.prototype.builderComplete = function ( message ) {
		if ( ! this.streamMeshes ) {

			for ( var meshStoreKey in this.meshStore ) {

				if ( this.meshStore.hasOwnProperty( meshStoreKey ) ) this.sceneGraphBaseNode.add( this.meshStore[ meshStoreKey ] );

			}

		}
		if ( Validator.isValid( message ) ) this.callbacks.onProgress( message );
	};

	return Commons;
})();


/**
 * Object to return by {@link THREE.LoaderSupport.Commons}.callbacks.meshLoaded.
 * Used to disregard a certain mesh or to return one to many created meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 */
THREE.LoaderSupport.LoadedMeshUserOverride = (function () {

	function LoadedMeshUserOverride( disregardMesh, alteredMesh ) {
		this.disregardMesh = disregardMesh === true;
		this.alteredMesh = alteredMesh === true;
		this.meshes = [];
	}

	/**
	 * Add a mesh created within callback.
	 *
	 * @memberOf THREE.OBJLoader2.LoadedMeshUserOverride
	 *
	 * @param {THREE.Mesh} mesh
	 */
	LoadedMeshUserOverride.prototype.addMesh = function ( mesh ) {
		this.meshes.push( mesh );
	};

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.isDisregardMesh = function () {
		return this.disregardMesh;
	};

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	LoadedMeshUserOverride.prototype.providesAlteredMeshes = function () {
		return this.alteredMesh;
	};

	return LoadedMeshUserOverride;
})();


/**
 * A resource description used by {@link THREE.LoaderSupport.PrepData} and others.
 * @class
 *
 * @param {string} url URL to the file
 * @param {string} extension The file extension (type)
 * @param {boolean} useArrayBuffer Whether content is arraybuffer or text
 */
THREE.LoaderSupport.ResourceDescriptor = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function ResourceDescriptor( url, extension, useArrayBuffer ) {
		var urlParts = url.split( '/' );

		if ( urlParts.length < 2 ) {

			this.path = null;
			this.name = this.name = url;
			this.url = url;

		} else {

			this.path = Validator.verifyInput( urlParts.slice( 0, urlParts.length - 1).join( '/' ) + '/', null );
			this.name = Validator.verifyInput( urlParts[ urlParts.length - 1 ], null );
			this.url = url;

		}
		this.extension = Validator.verifyInput( extension, "default" );
		this.extension = this.extension.trim();
		this.content = null;
		this.useArrayBuffer = useArrayBuffer !== false;
	}

	/**
	 * Set the content of this resource (String)
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {String} content The file content as text
	 */
	ResourceDescriptor.prototype.setTextContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.useArrayBuffer = false;
	};

	/**
	 * Set the content of this resource (String)
	 * @memberOf THREE.LoaderSupport.ResourceDescriptor
	 *
	 * @param {Uint8Array} content The file content as text
	 */
	ResourceDescriptor.prototype.setBinaryContent = function ( content ) {
		this.content = Validator.verifyInput( content, null );
		this.useArrayBuffer = true;
	};

	return ResourceDescriptor;
})();


/**
 * Base class for configuration of prepareRun when using {@link THREE.LoaderSupport.WW.MeshProvider}.
 * @class
 */
THREE.LoaderSupport.PrepData = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function PrepData( modelName ) {
		this.modelName = Validator.verifyInput( modelName, '' );
		this.resources = [];
		this.sceneGraphBaseNode = null;
		this.streamMeshes = true;
		this.materialPerSmoothingGroup = false;
		this.requestTerminate = false;
		this.materials = [];
		this.callbacks = new THREE.LoaderSupport.Callbacks();
		this.crossOrigin;
	}

	/**
	 * {@link THREE.Object3D} where meshes will be attached.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.Object3D} sceneGraphBaseNode Scene graph object
	 */
	PrepData.prototype.setSceneGraphBaseNode = function ( sceneGraphBaseNode ) {
		this.sceneGraphBaseNode = Validator.verifyInput( sceneGraphBaseNode, null );
	};

	/**
	 * Singles meshes are directly integrated into scene when loaded or later.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} streamMeshes=true Default is true
	 */
	PrepData.prototype.setStreamMeshes = function ( streamMeshes ) {
		this.streamMeshes = streamMeshes !== false;
	};

	/**
	 * Tells whether a material shall be created per smoothing group
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} materialPerSmoothingGroup=false Default is false
	 */
	PrepData.prototype.setMaterialPerSmoothingGroup = function ( materialPerSmoothingGroup ) {
		this.materialPerSmoothingGroup = materialPerSmoothingGroup;
	};

	/**
	 * Request termination of web worker and free local resources after execution.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {boolean} requestTerminate=false Default is false
	 */
	PrepData.prototype.setRequestTerminate = function ( requestTerminate ) {
		this.requestTerminate = requestTerminate === true;
	};

	/**
	 * Set materials loaded by any other supplier of an Array of {@link THREE.Material}.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.Material[]} materials  Array of {@link THREE.Material} from MTLLoader
	 */
	PrepData.prototype.setMaterials = function ( materials ) {
		if ( Validator.isValid( materials ) ) this.materials = materials;
	};

	/**
	 * Returns all callbacks as {@link THREE.LoaderSupport.Callbacks}
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @returns {THREE.LoaderSupport.Callbacks}
	 */
	PrepData.prototype.getCallbacks = function () {
		return this.callbacks;
	};

	/**
	 * Sets the CORS string to be used.
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {string} crossOrigin CORS value
	 */
	PrepData.prototype.setCrossOrigin = function ( crossOrigin ) {
		this.crossOrigin = crossOrigin;
	};

	/**
	 * Add a resource description
	 * @memberOf THREE.LoaderSupport.PrepData
	 *
	 * @param {THREE.LoaderSupport.ResourceDescriptor} The resource description
	 */
	PrepData.prototype.addResource = function ( resource ) {
		this.resources.push( resource );
	};


	PrepData.prototype.clone = function () {
		var clone = new THREE.LoaderSupport.PrepData( this.modelName );
		clone.resources = this.resources;
		clone.sceneGraphBaseNode = this.sceneGraphBaseNode;
		clone.streamMeshes = this.streamMeshes;
		clone.materialPerSmoothingGroup = this.materialPerSmoothingGroup;
		clone.requestTerminate = this.requestTerminate;
		clone.callbacks = this.callbacks;
		clone.crossOrigin = this.crossOrigin;
		return clone;
	};

	return PrepData;
})();