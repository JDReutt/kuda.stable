/* 
 * Kuda includes a library and editor for authoring interactive 3D content for the web.
 * Copyright (C) 2011 SRI International.
 *
 * This program is free software; you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation; either 
 * version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program; 
 * if not, write to the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, 
 * Boston, MA 02110-1301 USA.
 */

o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.debug');
o3djs.require('o3djs.element');
o3djs.require('o3djs.event');
o3djs.require('o3djs.loader');
o3djs.require('o3djs.math');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.particles');
o3djs.require('o3djs.picking');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.canvas');
o3djs.require('hemi.utils.inheritance');
o3djs.require('hemi.utils.hashtable');
o3djs.require('hemi.utils.jsUtils');
o3djs.require('hemi.utils.mathUtils');
o3djs.require('hemi.utils.shaderUtils');
o3djs.require('hemi.utils.stringUtils');
o3djs.require('hemi.utils.transformUtils');
o3djs.require('hemi.msg');
o3djs.require('hemi.console');
o3djs.require('hemi.picking');
o3djs.require('hemi.loader');
o3djs.require('hemi.world');
o3djs.require('hemi.octane');
o3djs.require('hemi.handlers.valueCheck');
o3djs.require('hemi.audio');
o3djs.require('hemi.dispatch');
o3djs.require('hemi.input');
o3djs.require('hemi.view');
o3djs.require('hemi.model');
o3djs.require('hemi.animation');
o3djs.require('hemi.motion');
o3djs.require('hemi.effect');
o3djs.require('hemi.scene');
o3djs.require('hemi.hud');
o3djs.require('hemi.manip');
o3djs.require('hemi.curve');
o3djs.require('hemi.sprite');
o3djs.require('hemi.shape');
o3djs.require('hemi.fx');
o3djs.require('hemi.texture');
o3djs.require('hemi.timer');

/**
 * @namespace The core Hemi library used by Kuda.
 * @version 1.5.1
 */
var hemi = (function(hemi) {
	
	/**
	 * The version of Hemi released: 11/30/11
	 * @constant
	 */
	hemi.version = '1.5.1';

	/**
	 * @namespace A module for handling low level functionality and wrapping
	 * calls to the underlying O3D library.
	 */
	hemi.core = hemi.core || {};
	
	/*
	 * Because Internet Explorer does not support Array.indexOf(), we can add
	 * it in so that subsequent calls do not break.
	 *
	 * @param {Object} obj
	 */
	if (!Array.indexOf) {
		Array.prototype.indexOf = function(obj) {
			for (var i = 0; i < this.length; i++) {
				if (this[i] == obj) {
					return i;
				}
			}
			return -1;
		};
	}
	
	/**
	 * This function creates a material that uses a lambert shader. Convenience
	 * function added to match createBasicMaterial and createConstantMaterial.
	 *
	 * @param {!o3d.Pack} pack Pack to manage created objects.
	 * @param {!o3djs.rendergraph.ViewInfo} viewInfo as returned from
	 *     o3djs.rendergraph.createBasicView.
	 * @param {(!o3djs.math.Vector4|!o3d.Texture)} colorOrTexture Either a color
	 *     in the format [r, g, b, a] or an O3D texture.
	 * @param {boolean} opt_transparent Whether or not the material is
	 *     transparent. Defaults to false.
	 * @return {!o3d.Material} The created material.
	 */
	o3djs.material.createLambertMaterial = function(pack, viewInfo,
			colorOrTexture, opt_transparent) {
		var material = pack.createObject('Material');
		material.drawList = opt_transparent ? viewInfo.zOrderedDrawList :
			viewInfo.performanceDrawList;
		
		if (colorOrTexture.length) {
			material.createParam('diffuse', 'ParamFloat4').value = colorOrTexture;
		} else {
			var paramSampler = material.createParam('diffuseSampler', 'ParamSampler'),
				sampler = pack.createObject('Sampler');
			paramSampler.value = sampler;
			sampler.texture = colorOrTexture;
		}
		
		material.createParam('emissive', 'ParamFloat4').value = [0, 0, 0, 1];
		material.createParam('ambient', 'ParamFloat4').value = [0, 0, 0, 1];
		material.createParam('lightColor', 'ParamFloat4').value = [1, 1, 1, 1];
		var lightPositionParam = material.createParam('lightWorldPos', 'ParamFloat3');
		
		o3djs.material.attachStandardEffect(pack, material, viewInfo, 'lambert');
		lightPositionParam.value = [1000, 2000, 3000];
		return material;
	};
	
	/**
	 * Pass the given error message to the registered error handler or throw an
	 * Error if no handler is registered.
	 * 
	 * @param {string} msg error message
	 */
	hemi.core.error = function(msg) {
		if (this.errCallback) {
			this.errCallback(msg);
		} else {
			var err = new Error(msg);
			err.name = 'HemiError';
			throw err;
		}
	};
	
	/**
	 * Set the given function as the error handler for Hemi errors.
	 * 
	 * @param {function(string):void} callback error handling function
	 */
	hemi.core.setErrorCallback = function(callback) {
		this.errCallback = callback;
	};

	hemi.core.init = function(clientElement) {
		// Create aliases o3djs libraries
		this.event = o3djs.event;
		this.loader = o3djs.loader;
		this.math = o3djs.math;
		this.particles = o3djs.particles;
		this.renderGraph = o3djs.rendergraph;
		this.canvas = o3djs.canvas;
		this.material = o3djs.material;
		this.shape = o3djs.shape;
		this.picking = o3djs.picking;
		this.primitives = o3djs.primitives;
		this.io = o3djs.io;
		this.debug = o3djs.debug;

		this.o3dElement = clientElement;
		this.o3d = this.o3dElement.o3d;
		this.client = this.o3dElement.client;
		this.mainPack = this.client.createPack();
		this.errCallback = null;

		hemi.picking.init();
		hemi.input.init();
		hemi.view.init();
		hemi.curve.init();
		hemi.model.init();
		hemi.effect.init();
		hemi.hud.init();
		hemi.shape.init();
		hemi.sprite.init();
		hemi.world.init();
	};
	
	/**
	 * Callback function for whenever a new model file is loaded. This function
	 * updates the picking tree and sets up materials.
	 *
	 * @param {o3d.Pack} pack the pack loaded with scene content
	 */
	hemi.core.loaderCallback = function(pack) {
		// Update picking info
		hemi.picking.pickManager.update();
		
		// Generate draw elements and setup material draw lists.
		o3djs.pack.preparePack(pack, hemi.view.viewInfo);
		
		var materials = pack.getObjectsByClassName('o3d.Material'),
			worldFog = hemi.world.fog;
		
		for (var m = 0; m < materials.length; ++m) {
			var material = materials[m];
			// Connect each material's lightWorldPos param to the camera
			var param = material.getParam('lightWorldPos');
			
			if (param) {
				param.bind(hemi.world.camera.light.position);
			}
			
			param = material.getParam('ambientIntensity');
			
			if (param) {
				param.value = [0.3, 0.3, 0.3, 0.2];
			}
			
			param = material.getParam('ambient');
			
			if (param) {
				param.value = [0.3, 0.3, 0.3, 0.2];
			}
			
			param = material.getParam('lightColor');
		
			if (param) {
				param.bind(hemi.world.camera.light.color);
			}
			
			// For now, the Z-sorted draw list does not work well with
			// transparent shapes like particles. So stick them in the
			// performance list.
			if (material.drawList == hemi.view.viewInfo.zOrderedDrawList) {
				material.drawList = hemi.view.viewInfo.performanceDrawList;
			}
			
			if (worldFog !== null) {
				var fogPrms = hemi.fx.addFog(material);
				fogPrms.start.value = worldFog.start;
				fogPrms.end.value = worldFog.end;
				fogPrms.color.value = worldFog.color;
			}
		}
	};
	
	return hemi;
})(hemi || {});
