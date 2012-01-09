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

var editor = {};

(function() {
	"use strict";
	
////////////////////////////////////////////////////////////////////////////////
//                               Dispatch Proxy                               //
////////////////////////////////////////////////////////////////////////////////

	var DispatchProxy = function() {
		// The set of MessageSpecs (and MessageTargets) being created by the
		// messaging tool
		this.worldSpecs = new hemi.utils.Hashtable();
		// The set of MessageSpecs used by the editor
		this.editorSpecs = null;
	};
	
	DispatchProxy.prototype = {
		swap: function() {
			if (this.editorSpecs === null) {
				this.editorSpecs = hemi.dispatch.msgSpecs;
				hemi.dispatch.msgSpecs = this.worldSpecs;
			}
		},
		
		unswap: function() {
			if (this.editorSpecs !== null) {
				hemi.dispatch.msgSpecs = this.editorSpecs;
				this.editorSpecs = null;
			}
		},
		
		getTargetSpec: function(target) {
			this.swap();
			var ret = hemi.dispatch.getTargetSpec(target);
			this.unswap();
			return ret;
		},
		
		getTargets: function(attributes, wildcards) {
			this.swap();
			var ret = hemi.dispatch.getTargets(attributes, wildcards);
			this.unswap();
			return ret;
		},
		
		registerTarget: function(src, msg, handler, opt_func, opt_args) {
			this.swap();
			var ret = hemi.dispatch.registerTarget(src, msg, handler, opt_func, 
				opt_args);
			this.unswap();
			return ret;
		},
		
		removeTarget: function(target, opt_attributes) {
			this.swap();
			var ret = hemi.dispatch.removeTarget(target, opt_attributes);
			this.unswap();
			return ret;
		},
		
		cleanup: function() {
			this.swap();
			hemi.dispatch.cleanup();
			this.unswap();
		},
		
		toOctane: function() {
			this.swap();
			var ret = hemi.dispatch.toOctane();
			this.unswap();
			return ret;
		}
	};
	
	var dispatchProxy = new DispatchProxy();
	
////////////////////////////////////////////////////////////////////////////////
//                                 Main App                                   //
////////////////////////////////////////////////////////////////////////////////
		
		
	function initViewer() {
		editor.client = hemi.makeClients()[0];
								
		setupWorldMessages();
		editor.ui.initializeView(editor.client);
		editor.projects.init();
		editor.plugins.init();
	};
		
	function setupWorldMessages() {			
		hemi.subscribe(hemi.msg.cleanup, function() {
			editor.notifyListeners(editor.events.WorldCleaned);
		});
		hemi.subscribe(hemi.msg.ready, function() {
			editor.notifyListeners(editor.events.WorldLoaded);
			editor.projects.loadingDone();
		});
	};
	
	function uninitViewer() {
		if (hemi.core.client) {
			hemi.core.client.cleanup();
		}
	};
	
////////////////////////////////////////////////////////////////////////////////
//                             Editor Utilities                               //
////////////////////////////////////////////////////////////////////////////////
	
	editor.getActivePlugins = function() {
		return activePlugins;
	};
	
	editor.getActiveTool = function() {
		var views = editor.getViews();
			
		for (var i = 0, il = views.length; i < il; i++) {
			var view = views[i];
			
			if (view.mode === editor.ToolConstants.MODE_DOWN) {
				return view;
			}
		}
		
		return null;
	};
	
	editor.getCss = function(url, media) {
		jQuery( document.createElement('link') ).attr({
	        href: url,
	        media: media || 'screen',
	        type: 'text/css',
	        rel: 'stylesheet'
	    }).appendTo('head');
	};
	
	editor.getDispatchProxy = function() {
		return dispatchProxy;
	};
			
	editor.getProjectOctane = function() {
		dispatchProxy.swap();
		var data = hemi.world.toOctane(function(citizen) {
			return citizen.name.search(editor.ToolConstants.EDITOR_PREFIX) === -1;
		});
		dispatchProxy.unswap();
		return data;
	};
	
	editor.getScript = function(url, callback) {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		
		editor.notifyListeners(editor.events.ScriptLoadStart, url);
		
		{
	        var done = false;
	
	        // Attach handlers for all browsers
	        script.onload = script.onreadystatechange = function(){
	            if (!done && (!this.readyState ||
	            		this.readyState == "loaded" || 
						this.readyState == "complete")) {
	                done = true;
					if (callback) {
						callback();
					}
					editor.notifyListeners(editor.events.ScriptLoaded, url);
	
	                // Handle memory leak in IE
	                script.onload = script.onreadystatechange = null;
	            }
	        };
	    }
		
	    document.body.appendChild(script);
	};
	
	window.onload = function() {	
		initViewer();
	};
	
//	window.onunload = function() {
//		uninitViewer();
//	};
})();
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

(function(editor) {
	/**
	 * @namespace A module for managing the string literals for event types.
	 * @example
	 * The documentation for each event type has an example of a typical data
	 * payload for that event type.
	 */
	editor.events = {
		Cancel: 'editor.Cancel',
		
		ColorPicked: 'editor.ColorPicked',
		
		Created: 'editor.Created',
		
		Edit: 'editor.Edit',
		
		Editing: 'editor.Editing',
		
		Enabled: 'editor.Enabled',
		
		Loaded: 'editor.Loaded',
		
		MenuItemClicked: 'editor.MenuItemClicked',
		
		ModelAdded: 'editor.ModelAdded',
		
		PanelVisible: 'editor.PanelVisible',
		
		PluginLoaded: 'editor.PluginLoaded',
		
		PluginRemoved: 'editor.PluginRemoved',
		
		Remove: 'editor.Remove',
		
		Removing: 'editor.Removing',
		
		Save: 'editor.Save',
		
		ScriptLoaded: 'editor.ScriptLoaded',
		
		ScriptLoadStart: 'editor.ScriptLoadStart',
		
		SidebarSet: 'editor.SidebarSet',
		
		ToolClicked: 'editor.ToolClicked',
		
		ToolModeSet: 'editor.ToolModeSet',
		
		ToolMouseIn: 'editor.ToolMouseIn',
		
		ToolMouseOut: 'editor.ToolMouseOut',
		
		Updated: 'editor.Updated',
		
		ViewAdded: 'editor.ViewAdded',
		
		WidgetVisible: 'editor.WidgetVisible',
		
		WorldCleaned: 'editor.WorldCleaned',
		
		WorldLoaded: 'editor.WorldLoaded'
	};
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.utils = editor.utils || {};
			
    /**
     * The Listenable ...
     */
	var Listenable = editor.utils.Listenable = function() {
		this.listeners = new Hashtable();
	};
		
	/**
	 * Adds a listener that listens for the event type given.
	 * 
	 * @param {string} eventType the event this listener is interested in
	 * @param {function(Object):void or Object that contains notify()} 
	 *        listener the listener to add
	 */        
    Listenable.prototype.addListener = function(eventType, listener) {
		var list = this.listeners.get(eventType);
		
		if (!list) {
			list = [];
		}
		
        var ndx = list.indexOf(listener);
        
        if (ndx == -1) {
            list.push(listener);
        }
		
		this.listeners.put(eventType, list);
    };
    
	/**
	 * Removes the given listener from this object's internal list of 
	 * listeners.
	 * 
	 * @param {function(Object):void or Object that contains notify()} 
	 *        listener the listener to remove.
	 */
    Listenable.prototype.removeListener = function(listener) {
        var found = null;
		
		if (this.listeners.containsValue(listener)) {
			var keys = this.listeners.keys();
			
			for (var ki = 0, kl = keys.length; ki < kl && !found; ki++) {
				var list = this.listeners.get(keys[ki]);
                var ndx = list.indexOf(listener);
                
                if (ndx != -1) {
                    var spliced = list.splice(ndx, 1);
                    
                    if (spliced.length == 1) {
                        found = spliced[0];
                    }
                }
			}
		}
		
        return found;
    };
    
	/**
	 * Notifies listeners interested in the given event type.
	 * 
	 * @param {string} eventType the event to notify about
	 * @param {Object} value the data to give to the interested listeners.
	 */
    Listenable.prototype.notifyListeners = function(eventType, value) {
		var list = this.listeners.get(eventType);
		
        if (list) {
            for (var ndx = 0, len = list.length; ndx < len; ndx++) {
                var listener = list[ndx];
                var isFnc = jQuery.isFunction(listener);
                
                if (isFnc) {
                    listener(value);
                }
                else {
                    listener.notify(eventType, value);
                }
            }
        }
    };
	
	// make the editor a listener
	var notifier = new editor.utils.Listenable();
			
	editor.addListener = function(eventType, listener) {
		notifier.addListener(eventType, listener);
	};
	
	editor.notifyListeners = function(eventType, value) {
		notifier.notifyListeners(eventType, value);
	};
	
	editor.removeListener = function(listener) {
		notifier.removeListener(listener);
	};			
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.utils = editor.utils || {};
	
	editor.utils.roundNumber = function(num, dec) {
	    var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	    return result;
	};
	
	/**
	 * Returns the list of parameters for a function. Note that if the function
	 * has been minified, the parameter names will most likely be different
	 * than what may be expected.
	 */
	editor.utils.getFunctionParams = function(func) {
		return func.toString().match(/\((.*?)\)/)[1].match(/[\w]+/g) || [];
    };
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.depends = editor.depends || {};
	
	var DependencyManager =function() {
		this.depends = new Hashtable();
	};
		
	DependencyManager.prototype.addDependency = function(child, parent) {
		var children = this.getDependencies(parent);
		
		if (children.indexOf(child) === -1) {
			children.push(child);
		}
		
		this.depends.put(parent.getId(), children);
	};
	
	DependencyManager.prototype.clearDependencies = function(citizen) {
		if (citizen.getId) {
			this.depends.remove(citizen.getId());
		}
	};
	
	DependencyManager.prototype.getDependencies = function(citizen, getAll) {
		var children = this.depends.get(citizen.getId()) || [];
		
		if (getAll) {
			for (var i = 0; i < children.length; ++i) {
				var child = children[i];
				
				if (child.getId) {
					var grandChildren = this.depends.get(child.getId()) || [];
					
					for (var j = 0, jl = grandChildren.length; j < jl; ++j) {
						gc = grandChildren[j];
						
						if (children.indexOf(gc) === -1) {
							children.push(gc);
						}
					}
				}
			}
		}
		
		return children;
	};
	
	DependencyManager.prototype.removeDependency = function(child, parent) {
		var children = this.getDependencies(parent),
			ndx = children.indexOf(child);
		
		if (ndx !== -1) {
			children.splice(ndx, 1);
		}
	};
	
	DependencyManager.prototype.resetDependencies = function(child) {
		this.depends.each(function(key, value) {
			var ndx = value.indexOf(child);
			
			if (ndx !== -1) {
				value.splice(ndx, 1);
			}
		});
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                              			  Private Methods		                              //
////////////////////////////////////////////////////////////////////////////////////////////////////	

	function createDependencyString(cits) {			
		var str = '';
		
		for (var i = 0, il = cits.length; i < il; ++i) {
			var cit = cits[i],
				name = cit.name,
				type;
			
			if (cit.getCitizenType) {
				type = cit.getCitizenType().split('.').pop();
			} else {
				type = 'Behavior';
			}
			
			if (i !== 0) {
				str += ', <br>';
			}
			
			str += name + ' (' + type + ')';
		}
		
		return str;
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                	   			Setup				                              //
////////////////////////////////////////////////////////////////////////////////////////////////////

	var mgr = new DependencyManager();
	
	editor.addListener(editor.events.PluginLoaded, function(name) {
		var model = editor.getModel(name);
		
		if (model) {
			model.addListener(editor.events.Removing, function(citizen) {
				mgr.clearDependencies(citizen);
		    });
		}
	});
	
	editor.depends.add = function(child, parent) {
		if (child && parent) {
			mgr.addDependency(child, parent);
		}
	};
	
	editor.depends.check = function(citizen) {
		var children = mgr.getDependencies(citizen, true),
			safe = children.length === 0;
		
		if (!safe) {
			var str = createDependencyString(children),
				dlg = editor.ui.createDependencyDialog(str);
			
			dlg.dialog('open');
		}
		
		return safe;
	};
	
	editor.depends.clear = function(citizen) {
		mgr.clearDependencies(citizen);
	};
	
	editor.depends.remove = function(child, parent) {
		if (child && parent) {
			mgr.removeDependency(child, parent);
		}
	};
	
	editor.depends.reset = function(child) {
		mgr.resetDependencies(child);
	};
	
	return editor;
})(editor || {});
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

(function(editor) {
	editor.data = editor.data || {};
	
	var MetaData =  function() {
		loadJSON.call(this);
	};
		
	getDescription = function(objType, opt_fnc, opt_param) {
		var parent = this.getParent(objType),
			args = [];
		
		for (var i = 0, il = arguments.length; i < il; ++i) {
			args[i] = arguments[i];
		}
		
		var retVal = retrieve.call(this, args);
		
		while (retVal == null && parent != null) {
			args[0] = parent;
			parent = this.getParent(parent);
			retVal = retrieve.call(this, args);
		}
		
		return retVal == null ? null : retVal.description;
	};
	
	getMsgDescription = function(objType, msgName) {
		var parent = this.getParent(objType),
			retVal = this.messages.get(objType + '.' + msgName);
		
		while (retVal == null && parent != null) {
			retVal = this.messages.get(parent + '.' + msgName);
			parent = this.getParent(parent);
		}
		
		return retVal;
	};
	
	getMethods = function(objType) {
		var methods = [];
		
		while (objType != null) {
			var data = this.types.get(objType);
			
			if (data) {
				methods = methods.concat(data.methods);
				objType = data.parent;
			} else {
				objType = null;
			}
		}
		
		return methods;
	};
	
	getParameters = function(objType, fnc) {
		var data = this.functions.get(objType + '.' + fnc),
			parent = this.getParent(objType);
		
		while (data == null && parent != null) {
			data = this.functions.get(parent + '.' + fnc);
			parent = this.getParent(parent);
		}
		
		return data ? data.parameters : null;
	};
	
	getParent = function(objType) {
		var data = this.types.get(objType);
		return data ? data.parent : null;
	};
	
	getType = function(objType, opt_fnc, opt_param) {
		var parent = this.getParent(objType),
			args = [];
		
		for (var i = 0, il = arguments.length; i < il; ++i) {
			args[i] = arguments[i];
		}
		
		var retVal = retrieve.call(this, args);
		
		while (retVal == null && parent != null) {
			args[0] = parent;
			parent = this.getParent(parent);
			retVal = retrieve.call(this, args);
		}
		
		return retVal == null ? null : retVal.type;
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                              			Private Methods			                              //
////////////////////////////////////////////////////////////////////////////////////////////////////

	function loadJSON() {
		var that = this;
		this.types = new Hashtable();
		this.functions = new Hashtable();
		this.parameters = new Hashtable();
		this.messages = new Hashtable();
		
		try {
			hemi.loader.loadHtml('js/editor/data/hemi.json', function(data) {
				var json = JSON.parse(data);
			
				for (var i = 0, il = json.length; i < il; i++) {
					var type = json[i],
						tname = type.name,
						funcs = type.funcs,
						msgs = type.msgs,
						tdata = {
							description: type.desc,
							methods: [],
							parent: type.parent
						};
						
					that.types.put(tname, tdata);
						
					for (var j = 0, jl = funcs.length; j < jl; j++) {
						var func = funcs[j],
							fname = func.name,
							params = func.params,
							fdata = {
								description: func.desc,
								parameters: []
							};
							
						tdata.methods.push(fname);				
						that.functions.put(tname + '.' + fname, fdata);
						
						for (var k = 0, kl = params.length; k < kl; k++) {
							var param = params[k],
								pname = param.name;
							
							fdata.parameters.push(pname);
							that.parameters.put(tname + '.' + fname + '.' + pname, {
								description: param.desc,
								type: param.type
							});
						}
					}
					
					for (var j = 0, jl = msgs.length; j < jl; ++j) {
						var msg = msgs[j];
						that.messages.put(tname + '.' + msg.name, msg.desc);
					}
				}
			});
		} catch (err) {
			hemi.console.log(err);
		}
	};
	
	function retrieve(names) {			
		var name = names.join('.'),
			retVal = this.types.get(name);
		
		if (retVal == null) {
			retVal = this.functions.get(name);
		}
		if (retVal == null) {
			retVal = this.parameters.get(name);
		}
		
		return retVal;
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                	   			Setup				                              //
////////////////////////////////////////////////////////////////////////////////////////////////////

	var metadata = new MetaData();	
	
	editor.data.getMetaData = function() {
		return metadata;
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	editor.ui.ComponentDefaults = {
		uiFile: null,
		showOptions: null,
		hideOptions: null
	};
	
	var Component = editor.ui.Component = function(options) {
		editor.utils.Listenable.call(this);
		
        this.config = jQuery.extend({}, editor.ui.ComponentDefaults, options);
		this.container = null;
		
		if (this.visible === undefined) {
			this.visible = false;
		}
		
		if (this.config.uiFile && this.config.uiFile !== '') {
			this.load();
		}
		else {
			this.layout();
			this.finishLayout();
			this.notifyListeners(editor.events.Loaded);
		}
	};

	Component.prototype = new editor.utils.Listenable();
	Component.prototype.constructor = Component;
		
	Component.prototype.layout = function() {
		// Place DOM elements
	};
	
	Component.prototype.finishLayout = function() {
		// Do any final styling or event binding
	};
	
	Component.prototype.load = function() {
		var cmp = this;
		this.container = jQuery('<div></div>');

		if (this.config.uiFile && this.config.uiFile !== '') {
			hemi.loader.loadHtml(this.config.uiFile, function(data) {
				// clean the string of html comments
				var cleaned = data.replace(/<!--(.|\s)*?-->/, '');
				cmp.container.append(jQuery(cleaned));
				cmp.layout();
				cmp.finishLayout();
				cmp.notifyListeners(editor.events.Loaded);
			});
		}
	};
	
	Component.prototype.getUI = function() {
		return this.container;
	};
	
	Component.prototype.setVisible = function(visible) {
		if (visible) {
			this.container.show(this.config.showOptions);
		}
		else {
			this.container.hide(this.config.hideOptions);
		}
	};
	
	Component.prototype.isVisible = function() {
		return this.container.is(':visible');
	};
	
	Component.prototype.find = function(query) {
		return this.container.find(query);
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                				Input	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var InputDefaults =  {
		container: null,
		inputClass: null,
		onBlur: null,
		placeHolder: null,
		type: 'number',
		validator: null
	};
			
	var Input = editor.ui.Input = function(options) {
		var newOpts = jQuery.extend({}, InputDefaults, options);
		this.value = null;
		editor.ui.Component.call(this, newOpts);
	};
		
	Input.prototype = new editor.ui.Component();
	Input.prototype.constructor = Input;
		
	Input.prototype.layout = function() {
		var wgt = this;
		
		if (this.config.container) {
			this.container = this.config.container;
			
			if (!this.config.placeHolder) {
				this.config.placeHolder = this.container.attr('placeholder');
			}
		} else {
			switch (this.config.type) {
				case 'boolean':
					this.container = jQuery('<input type="checkbox" />');
					break;
				default:
					this.container = jQuery('<input type="text" />');
					break;
			}
		}
		
		if (this.config.placeHolder) {
			this.container.attr('placeholder', this.config.placeHolder);
		}
		if (this.config.inputClass) {
			this.container.attr('class', this.config.inputClass);
		}
		if (this.config.validator) {
			this.config.validator.setElements(this.container);
		}
		
		this.container.bind('blur', function(evt) {
			var val = getContainerValue.call(wgt);
			wgt.setValue(val);
			
			if (wgt.config.onBlur) {
				wgt.config.onBlur(wgt, evt);
			}
		})
		.bind('focus', function(evt) {
			setContainerValue.call(wgt, wgt.value);
		});
	};
	
	Input.prototype.getValue = function() {
		if (this.container.is(':focus') || this.config.type === 'boolean') {
			return getContainerValue.call(this);
		} else {
			return this.value;
		}
	};
	
	Input.prototype.reset = function() {
		this.value = null;
		setContainerValue.call(this, null);
	};
	
	Input.prototype.setName = function(name) {
		this.config.placeHolder = name;
		this.container.attr('placeholder', name);
		this.setValue(this.value);
	};
	
	Input.prototype.setType = function(type) {
		this.config.type = type;
	};
	
	Input.prototype.setValue = function(value) {
		if (value == null) {
			this.reset();
		} else {
			this.value = value;
			
			switch (this.config.type) {
				case 'boolean':
					this.container.prop('checked', value);
					break;
				case 'angle':
					value = hemi.core.math.radToDeg(value);
				default:
					if (this.config.placeHolder) {
						this.container.val(this.config.placeHolder + ': ' + value);
					} else {
						this.container.val(value);
					}
					
					break;
			}
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//											Private Methods										  //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	function getContainerValue() {
		var val;
		
		switch (this.config.type) {
			case 'number':
				val = parseFloat(this.container.val());
				
				if (isNaN(val)) {
					val = null;
				}
				break;
			case 'integer':
				val = parseInt(this.container.val());
				
				if (isNaN(val)) {
					val = null;
				}
				break;
			case 'boolean':
				val = this.container.prop('checked');
				break;
			case 'angle':
				var deg = parseFloat(this.container.val());
				val = hemi.core.math.degToRad(deg);
				
				if (isNaN(val)) {
					val = null;
				}
				break;
			default:
				val = this.container.val();
				
				if (val === '') {
					val = null;
				}
				break;
		}
		
		return val;
	};
	
	function setContainerValue(value) {
		if (value == null) {
			switch (this.config.type) {
				case 'boolean':
					this.container.prop('checked', false);
					break;
				default:
					this.container.val('');
					break;
			}
		} else {
			switch (this.config.type) {
				case 'boolean':
					this.container.prop('checked', value);
					break;
				case 'angle':
					var deg = hemi.core.math.radToDeg(value);
					this.container.val(deg);
					break;
				default:
					this.container.val(value);
					break;
			}
		}
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	editor.ui.Constants = editor.ui.Constants || {};
	editor.ui.Constants.UP_STATE = "UP";
	editor.ui.Constants.DOWN_STATE = "DOWN";
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                			  Menu Item	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////

    /*
     * Configuration object for the MenuItem.
     */
    editor.ui.MenuItemDefaults = {
		title: null,
		action: null,
		stateful: false,
		stateDownClass: 'down',
		stateUpClass: 'up'
    };
    
    var MenuItem = editor.ui.MenuItem = function(options) {		
        var newOpts = jQuery.extend({}, editor.ui.MenuItemDefaults, options);
		editor.ui.Component.call(this, newOpts);
		
		this.stateful = newOpts.stateful;
		this.setState(editor.ui.Constants.UP_STATE);
		this.downClass = newOpts.stateDownClass;
		this.upClass = newOpts.stateUpClass;
    };
		
	MenuItem.prototype = new editor.ui.Component();
	MenuItem.prototype.constructor = MenuItem;
		
	MenuItem.prototype.layout = function() {
        this.container = jQuery('<a></a>');
        
        if (this.config.title) {
            this.setTitle(this.config.title);
        }
        
        if (this.config.action) {
            this.setAction(this.config.action);
        }
	};

	MenuItem.prototype.setTitle = function(title) {
        this.container.text(title);
    };
	
	MenuItem.prototype.setKeyboardShortcut = function(key) {
        
    };

    MenuItem.prototype.setAction = function(callback) {
		var that = this;
		
        this.container.bind('click', function(evt) {
            callback(evt);
			that.notifyListeners(editor.events.MenuItemClicked, that);
			that.toggleState();
        });
    };
	
	MenuItem.prototype.setState = function(state) {
		if (this.stateful) {
			// check
			if (state == editor.ui.Constants.DOWN_STATE ||
				state == editor.ui.Constants.UP_STATE) {
				var oldClass;
				var newClass;
				if (state == editor.ui.Constants.DOWN_STATE) {
					oldClass = this.upClass;
					newClass = this.downClass;
				} 
				else {
					oldClass = this.downClass;
					newClass = this.upClass;
				}
				
				this.state = state;
				this.container.removeClass(oldClass).addClass(newClass);
			}
			else {
				alert(state + ' is an improper state');
			}
		}
	};
	
	MenuItem.prototype.toggleState = function() {
		if (this.stateful) {
			this.setState(this.state == editor.ui.Constants.DOWN_STATE ? 
				editor.ui.Constants.UP_STATE : 
				editor.ui.Constants.DOWN_STATE);
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                				Menu	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var Menu = editor.ui.Menu = function(opt_title, opt_noAction) {
		var that = this;
		this.menuItems = [];
		this.shown = false;
		this.enabled = true;
			
		MenuItem.call(this);
	
		if (opt_title) {
			this.setTitle(opt_title);
		}
		
		if (!opt_noAction) {
			this.setAction(function(evt){
				if (that.shown) {
					that.hide();
					jQuery(document).unbind('click.menu');
				}
				else {
					var highestZ = 0;
					jQuery('.ui-dialog').each(function(){
						var z = parseInt(jQuery(this).css('zIndex'));
						highestZ = z > highestZ ? z : highestZ;
					});
					
					that.show();
					that.list.css('zIndex', highestZ + 1);
					jQuery(document).bind('click.menu', function(evt){
						var target = jQuery(evt.target), 
							parent = target.parents('.uiMenu');
						
						if (parent.size() == 0) {
							that.hide();
						}
					});
				}
			});
		}
	};
		
	Menu.prototype = new MenuItem();
	Menu.prototype.constructor = Menu;
		
	Menu.prototype.layout = function() {	
		this.container = jQuery('<div class="uiMenu"></div>');
		this.titleLink = jQuery('<span></span>');
        this.list = jQuery('<ul></ul>');
		this.listItem = jQuery('<li></li>');
		
		this.container.append(this.titleLink).append(this.list);
		this.list.hide();
	};

	Menu.prototype.addMenuItem = function(menuItem) {
		if (menuItem instanceof editor.ui.MenuItem) {
			var li = this.listItem.clone();
			var that = this;
			
			li.append(menuItem.getUI());
			this.list.append(li);
			this.menuItems.push(menuItem);
			
			menuItem.addListener(editor.events.MenuItemClicked, function(value) {
				that.hide();
			});
		} else {
			alert("Must be a menu item " + menuItem.getUI.html());
		}
	};
    
    Menu.prototype.setTitle = function(title) {
        this.titleLink.text(title).attr('id', 'uiMenuItem_' + title);
    };
    
    Menu.prototype.setAction = function(callback) {
		var that = this;
        this.titleLink.bind('click', function(evt) {
            if (that.enabled) {
				callback(evt);
			}
        });
    };
	
	Menu.prototype.setEnabled = function(enabled) {
		this.enabled = enabled;
	};
    
    Menu.prototype.hide = function() {
        this.list.fadeOut(200);
		this.shown = false;
		this.titleLink.removeClass('uiMenuShown');
    };
    
    Menu.prototype.show = function() {
        this.list.fadeIn(200);
        this.shown = true;
		this.titleLink.addClass('uiMenuShown');
    };
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                			Popup Menu	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var PopupMenu = editor.ui.PopupMenu = function(opt_title) {
		Menu.call(this, opt_title, true);
	};
	var popSuper = Menu.prototype;
		
	PopupMenu.prototype = new Menu();
	PopupMenu.prototype.constructor = PopupMenu;
		
	PopupMenu.prototype.finishLayout = function() {
		popSuper.finishLayout.call(this);
		this.container.css({
			'zIndex': editor.ui.Layer.MENU
		}).hide();
		this.list.show();
	};
	
	PopupMenu.prototype.hide = function() {
		this.container.fadeOut(200);
		this.shown = false;
		jQuery(document).unbind('click.menu');
		this.parent.removeClass('uiMenuShown');
		this.parent = null;
	};
	
	PopupMenu.prototype.show = function(position, parent) {			
		jQuery(document).bind('click.menu', function(evt){
			var target = jQuery(evt.target), 
				par = target.parents('.uiMenu');
			
			if (par.size() == 0 && target[0] != parent[0]) {
				that.hide();
			}
		});
					
		this.container.css({
			top: position.top,
			left: position.left
		}).fadeIn(200);
		this.shown = true;
		var that = this;
		this.parent = parent;
		
		parent.addClass('uiMenuShown');
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	editor.ui.ColorPickerDefaults = {
		container: null,
		inputId: 'color',
		buttonId: 'colorPicker',
		containerClass: ''
	};
	
	var ColorPicker = editor.ui.ColorPicker = function(options) {
		var newOpts =  jQuery.extend({}, editor.ui.ColorPickerDefaults, 
			options);
		editor.ui.Component.call(this, newOpts);
	};
		
	ColorPicker.prototype = new editor.ui.Component();
	ColorPicker.prototype.constructor = ColorPicker;
		
	ColorPicker.prototype.layout = function() {
		// initialize container
		this.container = jQuery('<div></div>');
		this.container.addClass(this.config.containerClass);
		
		// initialize inputs
		this.rInput = jQuery('<input type="text" id="' + this.config.inputId + 'R" class="rNdx color" placeholder="r" disabled />');
		this.gInput = jQuery('<input type="text" id="' + this.config.inputId + 'G"  class="gNdx color" placeholder="g" disabled />');
		this.bInput = jQuery('<input type="text" id="' + this.config.inputId + 'B"  class="bNdx color" placeholder="b" disabled />');
		this.aInput = jQuery('<input type="text" id="' + this.config.inputId + 'A"  class="aNdx color" placeholder="a" disabled />');
		
		// initialize colorpicker button
		this.pickerBtn = jQuery('<span id="' + this.config.buttonId + '" class="colorPicker"></span>');
		
		// add to container
		this.container.append(this.rInput).append(this.gInput)
			.append(this.bInput).append(this.aInput).append(this.pickerBtn);
			
		this.setupColorPicker();
	};

	ColorPicker.prototype.setupColorPicker = function() {			
		var r = this.rInput,
			g = this.gInput,
			b = this.bInput,
			a = this.aInput,
			colorPickerElem = this.pickerBtn,
			layer = editor.ui.Layer.DIALOG,
			wgt = this;
		
		var options = {
			window: {
				expandable: true,
				alphaSupport: true,
				position: {
					x: 'left',
					y: 'center'
				},
				effects: {
					type: 'fade',
					speed: {
						show: 'fast'
					}
				}
			},
			images: {
				clientPath: 'js/lib/jpicker/images/'
			},
			color: {
				active: '#ffffff'
			}
		};
		
		var colorPickedFcn = function(color) {
			var rndFnc = editor.utils.roundNumber;
						 
			r.val(rndFnc(color.val('r')/255, 2));
			g.val(rndFnc(color.val('g')/255, 2));
			b.val(rndFnc(color.val('b')/255, 2));
			a.val(rndFnc(color.val('a')/255, 2));
			
			var val = [
				parseFloat(r.val()), parseFloat(g.val()), parseFloat(b.val()), 
				parseFloat(a.val())
			];
			
			return val;
		};
			
		colorPickerElem.jPicker(options, function(color, context) {
			var clr = colorPickedFcn(color);
			wgt.notifyListeners(editor.events.ColorPicked, clr);
		});
			
		// save this picker
		var found = false,
			pickers = jQuery.jPicker.List;
		
		for (var ndx = 0, len = pickers.length; ndx < len && !found; ndx++) {
			var picker = pickers[ndx];
			if (jQuery(picker).attr('id') === this.config.buttonId) {
				this.picker = picker;
				found = true;
			}
		}
					
		// puts these last lines in the setTimeout queue, which should be
		// after the colorpicker
		setTimeout(function() {
			jQuery('div.jPicker.Container:last.Move').text('Color Picker');
		
			jQuery(wgt.picker).siblings('.jPicker')
				.bind('click', function(evt) {
					var btn = jQuery(this),
						win = options.window;
					
					// override default behavior
					jQuery('div.jPicker.Container').each(function(){
						var elem = jQuery(this);
						
						if (parseInt(elem.css('zIndex')) === 10) {
							elem.css({ zIndex: layer });	
						}
						else {
							// popups in the wrong place due to the button 
							// being hidden at first
							var left = win.position.x == 'left' ? (btn.offset().left - 530 - (win.position.y == 'center' ? 25 : 0)) :
									win.position.x == 'center' ? (btn.offset().left - 260) :
									win.position.x == 'right' ? (btn.offset().left - 10 + (win.position.y == 'center' ? 25 : 0)) :
									win.position.x == 'screenCenter' ? (($(document).width() >> 1) - 260) : (btn.offset().left + parseInt(win.position.x)),
								top = win.position.y == 'top' ? (btn.offset().top - 312) :
									win.position.y == 'center' ? (btn.offset().top - 156) :
									win.position.y == 'bottom' ? (btn.offset().top + 25) : (btn.offset().top + parseInt(win.position.y));
							
							elem.css({ 
								zIndex: layer + 1,
								left: Math.max(left, 0) + 'px',
								position: 'absolute',
								top: Math.max(top, 0) + 'px'
							});
							 
						}
					});
				});
			
			// find the last container and override default
			jQuery('div.jPicker.Container:last')
				.unbind('mousedown')
				.bind('mousedown', function() {
					jQuery('div.jPicker.Container').each(function() {								
						jQuery(this).css({ zIndex: layer });
					});
					jQuery(this).css({ zIndex: layer + 1 });
				});				
		}, 0);
	};
	
	ColorPicker.prototype.setColor = function(color) {	
		this.rInput.val(color[0]);
		this.gInput.val(color[1]);
		this.bInput.val(color[2]);
		this.aInput.val(color[3]);
		
		this.picker.color.active.val('rgba', {
			r: color[0] * 255,
			g: color[1] * 255,
			b: color[2] * 255,
			a: color[3] * 255
		});
	};
	
	ColorPicker.prototype.getColor = function() {
		var r = this.rInput.val(),
			g = this.gInput.val(),
			b = this.bInput.val(),
			a = this.aInput.val(),
			color = null;
		
		if (r !== '' && g !== '' && b !== '' && a !== '') {
			r = parseFloat(r);
			g = parseFloat(g);
			b = parseFloat(b);
			a = parseFloat(a);
			
			if (!(isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a))) {
				color = [r, g, b, a];
			}
		}
		
		return color;
	};
	
	ColorPicker.prototype.reset = function() {
		this.rInput.val('');
		this.gInput.val('');
		this.bInput.val('');
		this.aInput.val('');
		
		this.picker.color.active.val('hex', '#ffffff');
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	editor.ui.VectorDefaults = {
		container: null,
		inputs: ['x', 'y', 'z'],
		type: 'vector',
		inputType: 'number',
		onBlur: null,
		validator: null
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                			  	Vector	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var Vector = editor.ui.Vector = function(options) {
		var newOpts =  jQuery.extend({}, editor.ui.VectorDefaults, 
				options),
			ipts = newOpts.inputs;
		
		this.unbounded = ipts.length === 0;
		this.multiDim = jQuery.isArray(ipts[0]);
		this.multiDimUnbounded = this.multiDim && ipts[0].length === 0;
		
		this.inputs = [];
		
		editor.ui.Component.call(this, newOpts);
	};
		
	Vector.prototype = new editor.ui.Component();
	Vector.prototype.constructor = Vector;
		
	Vector.prototype.layout = function() {
		// initialize container
		this.container = this.config.container;
		
		if (this.unbounded || this.multiDimUnbounded) {
			layoutUnbounded.call(this);
		}
		else {
			layoutBounded.call(this);
		}
		
		this.validator = new editor.ui.VectorValidator(this);
	};
	
	Vector.prototype.setValue = function(values) {	
		if (this.unbounded || this.multiDimUnbounded) {
			setUnboundedValue.call(this, values);
		}
		else {
			setBoundedValue.call(this, values);
		}
	};
	
	Vector.prototype.getValue = function() {
		return (this.unbounded || this.multiDimUnbounded) ?
			getUnboundedValue.call(this) :
			getBoundedValue.call(this);
	};
	
	Vector.prototype.reset = function() {
		for (var i = 0, il = this.inputs.length; i < il; ++i) {
			this.inputs[i].elem.reset();
		}
	};
	
	Vector.prototype.setInputName = function(name, ndx1, opt_ndx2) {
		var found = false;
		
		for (var i = 0, il = this.inputs.length; i < il && !found; ++i) {
			var obj = this.inputs[i];
			
			if (obj.ndx1 === ndx1 && obj.ndx2 == opt_ndx2) {
				obj.elem.setName(name);
				found = true;
			}
		}
		
		return found;
	};
	
	Vector.prototype.setInputType = function(inputType) {
		for (var i = 0, il = this.inputs.length; i < il; ++i) {
			this.inputs[i].elem.setType(inputType);
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                              			Private Methods			                              //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	function createDiv(ndx) {
		var div = jQuery('<div class="vectorVec"></div>'),
			addBtn = jQuery('<button>Add</button>'),
			elem = createInput.call(this),
			wgt = this;
			
		addBtn.bind('click', function() {
			var btn = jQuery(this),
				i = btn.data('ndx'),
				newElem = createInput.call(wgt);
				
			wgt.inputs[i].push(newElem);
			btn.before(newElem.container);
		})
		.data('ndx', ndx);
		
		div.append(elem.container).append(addBtn);
		
		return {
			div: div,
			inputs: [elem]
		};
	};
	
	function createInput(opt_name) {
		var cfg = this.config;
		
		return new editor.ui.Input({
			inputClass: cfg.type,
			onBlur: cfg.onBlur,
			placeHolder: opt_name,
			type: cfg.inputType,
			validator: cfg.validator
		});
	};
		
	function getBoundedValue() {
		var values = [],
			isComplete = true;
		
		for (var i = 0, il = this.inputs.length; i < il && isComplete; i++) {
			var obj = this.inputs[i],
				val = obj.elem.getValue();
			
			isComplete = val !== '' && val !== null;
			
			if (isComplete) {
				if (this.multiDim) {
					var a = values[obj.ndx1];
					
					if (a == null) {
						a = values[obj.ndx1] = [];
					}
					
					a[obj.ndx2] = val;
				}
				else {
					values[obj.ndx1] = val;
				}
			}
		}
		
		return isComplete ? values : null;
	};
	
	function getUnboundedValue() {
		var values = [],
			isComplete = true,
			getVal = function(elem) {					
				var val = obj.elem.getValue();
				
				if (val === '') {
					val = null;
				}
				
				return val;
			};
		
		for (var i = 0, il = this.inputs.length; i < il && isComplete; i++) {
			var ipt = this.inputs[i];
			
			if (jQuery.isArray(ipt)) {
				var subVals = [];
				for (var j = 0, jl = ipt.length; j < jl && isComplete; j++) {
					var val = getVal(ipt[j]);
					subVals.push(val);
					isComplete = val != null;
				}
				values.push(subVals);
			}
			else {
				var val = getVal(ipt);
				values.push(val);
				isComplete = val != null;
			}
		}
		
		return isComplete ? values : null;
	};
	
	function layoutBounded() {
		var inputs = this.config.inputs,
			il = inputs.length,
			noPlaceHolders = false;
			
		// first detect a number or a list of placeholders
		if (il === 1 && hemi.utils.isNumeric(inputs[0])) {
			il = inputs[0];
			noPlaceHolders = true;
		}
		for (var i = 0; i < il; i++) {
			var ipt = inputs[i];
			
			if (this.multiDim) {
				var div = jQuery('<div class="vectorVec"></div>');
				
				if (ipt.length === 1 && hemi.utils.isNumeric(ipt[0])) {
					jl = ipt[0];
					noPlaceHolders = true;
				}
				
				for (var j = 0; j < jl; j++) {
					var inputTxt = ipt[j],
						elem = createInput.call(this, noPlaceHolders ? null : inputTxt);
					
					this.inputs.push({
						ndx1: i,
						ndx2: j,
						key: inputTxt,
						elem: elem
					});
					div.append(elem.container);
				}
				this.container.append(div);
			}
			else {
				var elem = createInput.call(this, noPlaceHolders ? null : ipt);
				
				this.inputs.push({
					ndx1: i,
					key: ipt,
					elem: elem
				});
				this.container.append(elem.container);
			}
		}
			
		setupAutoFills.call(this);
	};
	
	function layoutUnbounded() {
		var wgt = this,
			i = 0;
		
		this.addBtn = jQuery('<button>Add</button>');
		
		// initialize inputs
		do {
			if (this.multiDim) {
				var obj = createDiv.call(this, i);
				this.inputs.push(obj.inputs);
				this.container.append(obj.div);
			}
			else {
				var elem = createInput.call(this);
				this.inputs.push(elem);
				this.container.append(elem.container);
			}
			
			i++;
		} while (i < this.config.inputs.length);
		
		this.addBtn.bind('click', function() {
			var btn = jQuery(this),
				ndx = btn.data('ndx');
			
			if (wgt.multiDim) {
				var obj = createDiv.call(wgt, ndx);
				wgt.inputs.push(obj.inputs);
				btn.before(obj.div);
			}
			else {
				var elem = createInput.call(this);
				this.inputs.push(elem);
				btn.before(elem.container);
			}
			
			btn.data('ndx', ndx + 1);
		})
		.data('ndx', i);
									
		// add to container
		this.container.append(this.addBtn);
	};

	function setupAutoFills() {
		var wgt = this,
			vectors = wgt.find('.' + this.config.type);
		
		vectors.bind('keydown', function(evt) {
			var elem = jQuery(this);
			elem.removeClass('vectorHelper');
		})
		.bind('blur', function(evt) {
			var elem = jQuery(this),
				val = wgt.getValue();
			
			if (wgt.config.onBlur) {
				wgt.config.onBlur(elem, evt, wgt);
			}
		});
	};
	
	function setBoundedValue(values) {
		var inputs = this.inputs;
				
		if (jQuery.isArray(values)) {
			var find = function(ndx1, ndx2) {
					var found = null;
					
					for (var i = 0, il = inputs.length; i < il && found == null; i++) {
						var ipt = inputs[i],
							multi = ipt.ndx2 != null;
						
						if (multi && ipt.ndx1 === ndx1 && ipt.ndx2 === ndx2
								|| !multi && ipt.ndx1 === ndx1) {
							found = ipt;	
						}
					}	
					
					return found;				
				};
				
			// TODO: throw an error if values don't match our bounds
			for (var i = 0, il = values.length; i < il; i++) {
				var val = values[i];
				
				if (this.multiDim) {
					for (var j = 0, jl = val.length; j < jl; j++) {
						var subVal = val[j];							
						find(i, j).elem.setValue(subVal);
					}
				}
				else {
					find(i).elem.setValue(val);
				}
			}
		}
		else {
			for (var key in values) {
				var found = -1;
				
				for (var i = 0, il = inputs.length; i < il && found === -1; i++) {
					if (inputs[i].key == key) {
						found = i;
					}
				}
				
				var input = inputs[found].elem;
				
				if (input) {
					input.setValue(values[key]);
					input.container.removeClass('vectorHelper');
				}
			}
		}
	};
	
	function setUnboundedValue(values) {
		this.container.find('.vectorVec').remove();
		this.inputs = [];
		
		for (var i = 0, il = values.length; i < il; i++) {
			var input = this.inputs[i],
				valRow = values[i],
				isArray = jQuery.isArray(valRow);
				
			if (input == null) {
				if (isArray) {
					var obj = createDiv.call(this, i);
					input = this.inputs[i] = obj.inputs;					
					this.addBtn.before(obj.div);	
					// for later
					input.div = obj.div;
				}
				else {
					input = this.inputs[i] = createInput.call(this);
					this.addBtn.before(input.container);	
				}				
			}
			
			if (isArray) {
				for (var j = 0, jl = valRow.length; j < jl; j++) {
					var val = valRow[j],
						ipt = input[j];
					
					if (ipt == null) {
						ipt = input[j] = createInput.call(this);
					}
					ipt.setValue(val);
					input.div.find('button').before(ipt.container);
				}
			}
			else {
				input.setValue(values[i]);
			}
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                               			Helper Methods			                              //
////////////////////////////////////////////////////////////////////////////////////////////////////		
		
	function contains(val, container) {
		var found = jQuery.inArray(val, container) !== -1;
		
		if (!found) {
			for (var i = 0, il = container.length; i < il && !found; i++) {
				var row = container[i];
				
				if (jQuery.isArray(row)) {
					found = jQuery.inArray(val, row) !== -1;
				} 
				else {
					break;
				}
			}
		}
		
		return found;
	};
			
})(editor || {});
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	var eventNdx = 0;
	
	editor.ui.TreeSelectorDefaults = {
		containerClass: '',
		panelHeight: 400,
		tree: null,
		select: null
	};
	
	var TreeSelector = editor.ui.TreeSelector = function(options) {
		var newOpts =  jQuery.extend({}, editor.ui.TreeSelectorDefaults, 
			options);
		this.eventName = 'click.treeSelector' + eventNdx;
		this.buttonId = 'treeSelectorBtn' + eventNdx;
		this.inputId = 'treeSelectorIpt' + eventNdx;
		this.panelId = 'treeSelectorPnl' + eventNdx++;
		editor.ui.Component.call(this, newOpts);
	};
		
	TreeSelector.prototype = new editor.ui.Component();
	TreeSelector.prototype.constructor = TreeSelector;
		
	TreeSelector.prototype.layout = function() {			
		var wgt = this,
			
			toggleFcn = function(evt) {
				var ipt = wgt.input,
					btn = wgt.picker,
					pnl = wgt.panel;
				
				if (pnl.is(':visible')) {
					wgt.hidePanel();
					
					jQuery(document).unbind(wgt.eventName);
					pnl.data('docBound', false);
					btn.removeClass('open');
					ipt.removeClass('open');
				}
				else {
					var isDocBound = pnl.data('docBound');
					ipt.addClass('open');
					btn.addClass('open');
					width = ipt.outerWidth() + btn.outerWidth() -
						wgt.treeBorder - wgt.treePadding;
					
					wgt.showPanel(width);
										
					if (!isDocBound) {
						jQuery(document).bind(wgt.eventName, function(evt){
							var target = jQuery(evt.target),
								parent = target.parents('#' + wgt.panelId),
								id = target.attr('id');
							
							if (parent.size() == 0 
									&& id != wgt.panelId
									&& id != wgt.inputId
									&& id != wgt.buttonId) {
								wgt.hidePanel();
							}
						});
						pnl.data('docBound', true);
					}
				}
			};
		
		// initialize container
		this.container = jQuery('<div class="treeSelector"></div>');
		this.input = jQuery('<input type="text" id="' + this.inputId + '" class="treeSelectorIpt" readonly="readonly" placeholder="Select an item" />');
		this.picker = jQuery('<button id="' + this.buttonId + '" class="treeSelectorBtn">Selector</button>');
		var pnl = this.panel = jQuery('<div id="' + this.panelId + '" class="treeSelectorPnl"></div>');

		this.treeBorder = Math.ceil(parseFloat(pnl.css('borderRightWidth'))) 
			+ Math.ceil(parseFloat(pnl.css('borderLeftWidth')));
		this.treePadding = Math.ceil(parseFloat(pnl.css('paddingLeft'))) 
			+ Math.ceil(parseFloat(pnl.css('paddingRight')));
		
		this.selFcn = function(evt, data){
			if (wgt.config.select) {
				if (wgt.config.select(data, wgt)) {
					wgt.picker.removeClass('selected');
					wgt.hidePanel();
				}
			}
			else {
				var elem = data.rslt.obj, 
					val = elem.find('a').text();
				
				wgt.input.val(val);
				wgt.hidePanel();
				wgt.picker.removeClass('selected');
				wgt.setSelection(val);
			}
		};
		
		if (this.config.tree) {
			this.setTree(this.config.tree);
		}
		else {
			this.input.attr('placeholder', 'No items to select');
		}		
		this.container.addClass(this.config.containerClass);
		
		jQuery('body').append(this.panel);
		this.container.append(this.input).append(this.picker);
		this.panel.css({
			maxHeight: this.config.panelHeight,
			position: 'absolute'
		}).hide();
		
		this.input.bind('click', toggleFcn);
		this.picker.bind('click', toggleFcn);
	};
	
	TreeSelector.prototype.getSelection = function() {
		return this.input.data('selectObj');
	};
	
	TreeSelector.prototype.hidePanel = function() {
		this.panel.slideUp(200);
		this.input.removeClass('open');
		this.picker.removeClass('open');
	};
	
	TreeSelector.prototype.reset = function() {
		this.input.val('');
		this.input.removeData('selectObj');
		this.tree.jstree('deselect_all');
	};

	TreeSelector.prototype.select = function(nodeId) {
		var elem = jQuery('#' + nodeId);
		this.tree.jstree('select_node', elem);
	};
	
	TreeSelector.prototype.setSelection = function(obj) {
		this.input.data('selectObj', obj);
	};
	
	TreeSelector.prototype.setTree = function(tree) {			
		this.tree = tree; 
		tree.bind('select_node.jstree', this.selFcn).addClass('treeSelectorTree');	
		this.panel.append(tree);
	};
	
	TreeSelector.prototype.showPanel = function(width) {
		var position = this.input.offset(),
			width = width || this.container.width();
		
		position.top += this.input.outerHeight();
		this.panel.css({
			top: position.top,
			left: position.left
		}).width(width).slideDown(200);
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	// internal.  no one else can see or use
	var Tooltip = function(options) {
		var newOpts = jQuery.extend({
			cls: '',
			mouseHide: true
		}, options);
		
		editor.ui.Component.call(this, newOpts);
		this.id = 0;
		this.currentElement = null;
	};
		
	Tooltip.prototype = new editor.ui.Component();
	Tooltip.prototype.constructor = Tooltip;
		
	Tooltip.prototype.layout = function() {
		var wgt = this,
			hideFromMouse = function() {
				if (!wgt.isAnimating) {
					wgt.hide(0);
				}
			};
		
		this.container = jQuery('<div class="tooltip ' + this.config.cls + '"></div>');
		this.msg = jQuery('<div class="content"></div>');
		this.arrow = jQuery('<div class="arrow"></div>');
		
		// attach to the main body and bind mouse handler
		this.container.append(this.msg);
		
		if (this.config.mouseHide) {
			this.container.bind('mouseenter', hideFromMouse)
			.bind('mouseleave', hideFromMouse);
		}
		
		// detect border
		if (this.msg.css('borderLeftWidth') !== 0) {
			this.arrow.addClass('outer');
			this.innerArrow = jQuery('<div class="innerArrow"></div>');
			this.msg.before(this.arrow);
			this.container.append(this.innerArrow);
		}
		else {
			this.container.append(this.arrow);
		}
		
		// hide
		this.container.hide();
		this.isVisible = false;
	};
	
	Tooltip.prototype.show = function(element, content, opt_autohide, opt_offset) {
		var ctn = this.container,
			wgt = this,
			off = jQuery.extend({ top: 0, left: 0 }, opt_offset);
		
		this.currentElement = element;
		
		if (this.container.parents().size() === 0) {
			jQuery('body').append(this.container);
		}
		
		if (jQuery.type(content) == 'string') {
			this.msg.text(content);
		}
		else {
			this.msg.empty().append(content);
		}
		ctn.show();
		
		var	offset = element.offset(),
			height = ctn.outerHeight(true),
			width = ctn.outerWidth(true),
			center = element.width() / 2,
			elemHeight = element.height(),
			atTop = offset.top - height < 0,
			arrowHeight = this.arrow.outerHeight(),
			arrowCenter = this.arrow.outerWidth() / 2,
			arrowLeft = arrowCenter > center ? 5 : center - arrowCenter,
			windowWidth = window.innerWidth ? window.innerWidth 
				: document.documentElement.offsetWidth,
			windowHeight = jQuery(window).height(),
			difference = width + offset.left > windowWidth 
				? offset.left - (windowWidth - width) : 0,
			top = atTop ? offset.top + elemHeight + arrowHeight  + off.top
				: offset.top - height - off.top,
			bottom = atTop ? windowHeight - (offset.top + elemHeight 
				+ arrowHeight + off.top + height) 
				: windowHeight - (offset.top - off.top);
		
		// position this
		ctn.css({
			bottom: bottom - 20,
			left: offset.left - difference
		});
		
		if (atTop) {
			this.innerArrow.addClass('top');
			this.arrow.addClass('top');
		}
		else {
			this.innerArrow.removeClass('top');
			this.arrow.removeClass('top');
		}			
		
		// position the arrow
		this.innerArrow.css({
			left: arrowLeft 
		});
		this.arrow.css({
			left: arrowLeft
		});
		
		if (!this.isAnimating) {
			var doc = jQuery(document),
				checkMouse = function(evt) {
					// Make sure the mouse is still over the correct element
					if (wgt.currentElement) {
						var ce = wgt.currentElement[0],
							et = evt.target,
							ep = jQuery(et).parent()[0];
						
						if (et !== ce && ep !== ce) {
							wgt.hide(0);
						}
					}
					doc.unbind('mousemove', checkMouse);
				};
			
			this.isAnimating = true;				
			ctn.css('opacity', 0).animate({
				opacity: 1,
				bottom: '+=20'
			}, 200, function(){
				wgt.isAnimating = false;
				wgt.isVisible = true;
				doc.bind('mousemove', checkMouse);
			});
		}
		
		// auto hide the message
		if (opt_autohide != null) {
			this.hideTimer(true, opt_autohide);
		}
	};
	
	Tooltip.prototype.hide = function(opt_time) {
		this.hideTimer(false, opt_time);
	};
	
	Tooltip.prototype.hideTimer = function(resetTimer, opt_time) {
		var wgt = this,
			id = this.id,
			time = opt_time == null ? 2000 : opt_time;
		
		if (resetTimer) {
			id = this.id += 1;
		}
		
		setTimeout(function() {
			wgt.hideMessage(id);
		}, time);
	};
	
	Tooltip.prototype.hideMessage = function(id) {
		if (this.id === id) {
			var ctn = this.container,
				wgt = this;
			
			ctn.animate({
				opacity: 0,
				bottom: '+=20'
			}, 200, function(){
				ctn.hide();
				wgt.isVisible = false;
				wgt.currentElement = null;
			});
		}
	};
	
	editor.ui.createTooltip = function(opts) {		
		return new Tooltip(opts);
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	var tooltip = new editor.ui.createTooltip({
			cls: 'errorWrapper'
		});
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                			  Validator	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var Validator = editor.ui.Validator = function(opt_elements, checkFunction) {
		editor.utils.Listenable.call(this);
		this.checkFunction = checkFunction;
		this.containerClass = 'errorWrapper';
		
		if (opt_elements != null) {			
			this.setElements(opt_elements);
		}
	};
		
	Validator.prototype = new editor.utils.Listenable();
	Validator.prototype.constructor = Validator;
		
	Validator.prototype.setElements = function(elements) {	
		var vld = this;
				
		elements.bind('change.errEvt', function(evt) {
			var elem = jQuery(this),
				msg = null;
							
			msg = vld.checkFunction(elem);
			
			if (msg) {
				tooltip.show(elem, msg, 2000);
				elem.addClass('error');
			}
			else {
				tooltip.hide();	
				elem.removeClass('error');
			}
		});
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                		  Vector Validator                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var VectorValidator = editor.ui.VectorValidator = function(vector) {
		editor.utils.Listenable.call(this);
		this.containerClass = 'errorWrapper';
		this.timeoutId = null;
		this.vector = vector;
		
		var vecInputs = vector.find('.' + vector.config.type),
			that = this;
		
		vecInputs.bind('focus', function(evt) {
			if (that.timeoutId) {
				clearTimeout(that.timeoutId);
				that.timeoutId = null;
			}
		})
		.bind('blur', function(evt) {
			var inputs = that.vector.inputs,
				firstVal = inputs[0].elem.getValue(),
				isNull = firstVal === '' || firstVal === null,
				msg = null;
			
			for (var i = 1, il = inputs.length; i < il && !msg; i++) {
				var val = inputs[i].elem.getValue(),
					check = val === '' || val === null;
				
				if (check !== isNull) {
					msg = 'must fill out all values';
				}
			}
			
			if (msg) {
				that.timeoutId = setTimeout(function() {
					that.timeoutId = null;
					tooltip.show(that.vector.getUI(), msg, 3000);
					vecInputs.addClass('error');
				}, 1500);
			} else {
				tooltip.hide();	
				vecInputs.removeClass('error');
			}
		});
	};
		
	VectorValidator.prototype = new editor.utils.Listenable();
	VectorValidator.prototype.constructor = VectorValidator;
	
	editor.ui.createDefaultValidator = function(opt_min, opt_max) {
		var validator = new editor.ui.Validator(null, function(elem) {
			var val = elem.val(),
				msg = null;
				
			if (!checkNumber(val)) {
				msg = 'must be a number';
			}
			else if ((this.min != null || this.max != null) 
					&& !checkRange(val, this.min, this.max)) {						
				msg = this.min != null && this.max != null ? 
					'must be between ' + this.min + ' and ' + this.max
					: this.min != null ? 'must be greater than or equal to ' + this.min 
					: 'must be less than or equal to ' + this.max;
			}
			
			return msg;
		});
		
		validator.min = opt_min;
		validator.max = opt_max;
		
		return validator;	
	};
	
	function checkNumber(val) {	
		return val === '' || hemi.utils.isNumeric(val);
	};
		
	function checkRange(val, min, max) {
		var num = parseFloat(val);					
		return val === '' || (min != null && max != null 
			? num >= min && num <= max 
			: min != null && max == null ? num >= min : num <= max);
	};
	
	return editor;
})(editor || {}, jQuery);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};	
	
	editor.ui.ListType = {
		UNORDERED: 0,
		ORDERED: 1
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                				List	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	/*
	 * Configuration object for the Widget.
	 */
	editor.ui.ListDefaults = {
		id: '',
		cssClass: '',
		prefix: 'lst',
		type: editor.ui.ListType.UNORDERED,
		sortable: false
	};

	var List = editor.ui.List = function(options) {
		var newOpts = jQuery.extend({}, editor.ui.ListDefaults, options);
		editor.ui.Component.call(this, newOpts);
		
		this.list;
		this.listItemTemplate;
		this.idCounter = 0;
		this.listItems = new Hashtable();
	};
		
	List.prototype = new editor.ui.Component();
	List.prototype.constructor = List;
		
	List.prototype.add = function(liWidget) {
		this.list.append(this.createListItem(liWidget));
		liWidget.setParent(this);
	};
	
	List.prototype.after = function(liWidget, previousWidget) {
		previousWidget.getUI().parent().after(this.createListItem(liWidget));
		liWidget.setParent(this);
	};
	
	List.prototype.before = function(liWidget, nextWidget) {
		nextWidget.getUI().parent().before(this.createListItem(liWidget));
		liWidget.setParent(this);
	};
	
	List.prototype.clear = function() {
		this.list.empty();
		this.listItems.clear();
	};
	
	List.prototype.createListItem = function(liWidget) {
		var li = jQuery('<li></li>'),
			id = this.config.prefix + 'LstItm-' + this.idCounter;
			
		li.attr('id', id).append(liWidget.getUI());
		li.data('obj', liWidget);
		this.listItems.put(liWidget, li);
		
		this.idCounter += 1;
		
		return li;
	};
	
	List.prototype.edit = function(id, item, newName) {
		var li = this.list.find('#' + id),
			widget = li.data('obj');
		
		widget.attachObject(item);
		widget.setText(newName);
	};
	
	List.prototype.layout  = function() {
		this.container = this.list = 
			this.config.type == editor.ui.ListType.UNORDERED ?
			jQuery('<ul class="listWidget"></ul>') : 
			jQuery('<ol class="listWidget"></ol>');
		this.list.attr('id', this.config.id)
			.addClass(this.config.cssClass);
		
		if (this.config.sortable) {
			this.list.sortable();
		}
	};
	
	List.prototype.makeSortable = function() {
		this.list.sortable();
	};
	
	List.prototype.remove = function(idOrWidget) {
		var li = null;
		
		if (typeof idOrWidget === 'string') {
			li = this.list.find('#' + idOrWidget);
			var widget = li.data('obj');
			widget.setParent(null);
			this.listItems.remove(widget);
		}
		else if (idOrWidget instanceof editor.ui.ListItem) {
			li = this.listItems.remove(idOrWidget);
		}
		
		if (li !== null) {
			li.remove();
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                			  List Item	                                          //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	var ListItem = editor.ui.ListItem = function(options) {
		editor.ui.Component.call(this, options);
	};
		
	ListItem.prototype = new editor.ui.Component();
	ListItem.prototype.constructor = ListItem;
		
	ListItem.prototype.attachObject = function(object) {
		this.container.data('obj', object);
	};
	
	ListItem.prototype.data = function(key, value) {
		if (value != null) {
			return this.container.data(key, value);
		}
		else {
			return this.container.data(key);
		}
	};
	
	ListItem.prototype.layout = function() {
		this.container = jQuery('<div></div>');
	};
	
	ListItem.prototype.getAttachedObject = function() {
		return this.container.data('obj');
	};
	
	ListItem.prototype.getId = function() {
		return this.container.parent().attr('id');
	};
	
	ListItem.prototype.getText = function() {
		return this.container.text();
	};
	
	ListItem.prototype.remove = function() {
		this.container.remove();
	};
	
	ListItem.prototype.removeObject = function() {
		this.container.data('obj', null);
	};
	
	ListItem.prototype.setId = function(id) {
		this.container.parent().attr('id', id);
	};
	
	ListItem.prototype.setParent = function(parent) {
		this.parent = parent;
	};
	
	ListItem.prototype.setText = function(text) {
		this.container.text(text);
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                                		 Editable List Item                                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

	editor.ui.EdtLiWgtDefaultOptions = {
		removable: true,
		editable: true
	};
	
	var EditableListItem = editor.ui.EditableListItem = function(options) {
		var newOpts = jQuery.extend({}, editor.ui.EdtLiWgtDefaultOptions, options);
		editor.ui.ListItem.call(this, newOpts);
	};
	var eliSuper = editor.ui.ListItem.prototype;
		
	EditableListItem.prototype = new editor.ui.ListItem();
	EditableListItem.prototype.constructor = EditableListItem;
						
	EditableListItem.prototype.layout = function() {
		eliSuper.layout.call(this);
		
		var btnDiv = jQuery('<div class="buttonContainer"></div>');
		this.title = jQuery('<span></span>');
		
		if (this.config.editable) {
			this.editBtn = jQuery('<button class="editBtn">Edit</button>');
			btnDiv.append(this.editBtn);
		}
		if (this.config.removable) {
			this.removeBtn = jQuery('<button class="removeBtn">Remove</button>');
			btnDiv.append(this.removeBtn);				
		}
		
		this.container.append(this.title).append(btnDiv);
	};
	
	EditableListItem.prototype.getText = function() {
		return this.title.text();
	};
	
	EditableListItem.prototype.setText = function(text) {
		this.title.text(text);
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};	
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   				Constants			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	editor.ui.Layer = {
		TOOL: 500,
		TOOLBAR: 600,
		DIALOG: 700,
		MENU: 800
	};
	
	editor.ui.Location = {
		TOP: 0,
		RIGHT: 1,
		BOTTOM: 2
	};
	
	editor.ui.Height = {
		FULL: 0,
		HALF: 1,
		THIRD: 2,
		MANUAL: 3
	};
	
	var EXTENT = 50,		// Grid will reach 50 meters in each direction
		FIDELITY = 1,		// Grid squares = 1 square meter

		FARPLANE = 10000,
		NEARPLANE = 0.5;


////////////////////////////////////////////////////////////////////////////////////////////////////
//												  Panel				  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////

	var panels = [];
	
	var PanelBase = function(options) {
		var newOpts = jQuery.extend({
			location: editor.ui.Location.RIGHT,
			classes: [],
			minMax: true,
			startsVisible: true
		}, options);
		
		this.minMaxBtn = null;
		this.origOpacity = null;
		this.visible = true;
		
		this.name = newOpts.location === editor.ui.Location.TOP ?
			'topPanel' : newOpts.location === editor.ui.Location.BOTTOM ?
			'bottomPanel' : 'sidePanel';

		editor.ui.Component.call(this, newOpts);
		
		if (!options.extending) {
			panels.push(this);
		}
	};
		
	PanelBase.prototype = new editor.ui.Component();
	PanelBase.prototype.constructor = PanelBase;
	
	PanelBase.prototype.layout = function() {
		var minMaxBtn = this.minMaxBtn = jQuery('<button class="minMax" style="position:absolute;"></button>'),
			ctn = this.container = jQuery('<div></div>'),
			pnl = this;
		
		jQuery('body').append(ctn);
		
		if (this.config.minMax) {
			ctn.append(minMaxBtn);
		}
		
		// put this on the tool layer and align it correctly
		ctn.css({
			zIndex: editor.ui.Layer.TOOL
		})
		.bind('mouseenter', showMinMaxBtn)
		.bind('mouseleave', hideMinMaxBtn);
		
		minMaxBtn.bind('click', function(evt) {
			var min = minMaxBtn.data('min');
			
			if (min) {
				pnl.minimize();
			} else {
				pnl.maximize();
			}
			
			minMaxBtn.data('min', !min);
		}).data('origOpacity', 1).data('min', true).text('Min').hide();
		
		// add any specified classes
		for (var i = 0, il = this.config.classes.length; i < il; i++) {
			ctn.addClass(this.config.classes[i]);
		}
		
		switch(this.config.location) {
			case editor.ui.Location.RIGHT:
				ctn.addClass('rightAligned');
				break;
			case editor.ui.Location.TOP:
				ctn.addClass('topAligned');
				break;
			case editor.ui.Location.BOTTOM:
				ctn.addClass('bottomAligned');
				break;
		}
		
		
		this.origOpacity = ctn.css('opacity');
	};
	
	PanelBase.prototype.getName = function() {
		return this.name;
	};
	
	PanelBase.prototype.getPreferredHeight = function() {
		return this.preferredHeight;
	};
	
	PanelBase.prototype.isVisible = function() {
		return this.visible;
	};
	
	PanelBase.prototype.maximize = function() {
		var animData = {},
			minMaxBtn = this.minMaxBtn,
			that = this;
		
		addSlideAnim.call(this, 0, animData);
		this.container.bind('mouseleave', hideMinMaxBtn)
			.bind('mouseenter', showMinMaxBtn)
			.animate(animData, function() {
				minMaxBtn.text('Min');
			})
			.removeClass('minimized');
	};
	
	PanelBase.prototype.minimize = function() {
		var animData = {},
			minMaxBtn = this.minMaxBtn,
			that = this,
			dest;
		
		switch(this.config.location) {
			case editor.ui.Location.TOP:
			case editor.ui.Location.BOTTOM:
				dest = this.container.height();
				break;
			case editor.ui.Location.RIGHT:
			default:
				dest = this.container.width();
				break;
		}
		
		addSlideAnim.call(this, -1 * dest, animData);
		this.container.unbind('mouseleave', hideMinMaxBtn)
			.unbind('mouseenter', showMinMaxBtn)
			.animate(animData, function() {
				minMaxBtn.text('Max');
			})
			.addClass('minimized');
	};
	
	PanelBase.prototype.resize = function() {
		var ctnHeight = this.container.outerHeight(),
			ctnWidth = this.container.outerWidth(),
			btnHeight= this.minMaxBtn.outerHeight(),
			btnWidth = this.minMaxBtn.outerWidth(),
			windowWidth = window.innerWidth ? window.innerWidth 
				: document.documentElement.offsetWidth,
			midWidth = (windowWidth - ctnWidth)/2;
		
		switch(this.config.location) {
			case editor.ui.Location.RIGHT:
				this.minMaxBtn.css({
					top: (ctnHeight - btnHeight)/2,
					right: ctnWidth
				});
				break;
			case editor.ui.Location.TOP:
				this.container.css({
					left: midWidth
				});
				this.minMaxBtn.css({
					left: (ctnWidth - btnWidth)/2,
					top: ctnHeight
				});
				break;
			case editor.ui.Location.BOTTOM:
				this.container.css({
					left: midWidth
				});
				this.minMaxBtn.css({
					left: (ctnWidth - btnWidth)/2,
					bottom: ctnHeight
				});
				break;
			default:
				this.minMaxBtn.css({
					top: (ctnHeight - btnHeight)/2,
					left: ctnWidth
				});
				break;
		}
	};
	
	PanelBase.prototype.setVisible = function(visible, opt_skipAnim) {
		if (visible !== this.visible) {
			setVisible.call(this, visible, opt_skipAnim);
			
			if (!visible) {							
				this.container.bind('mouseleave', hideMinMaxBtn)
					.bind('mouseenter', showMinMaxBtn)
					.removeClass('minimized');
			}
			var pnl = this;
			this.resize();
			this.visible = visible;
			this.notifyListeners(editor.events.PanelVisible, {
				panel: pnl,
				visible: visible
			});
		}
	};

////////////////////////////////////////////////////////////////////////////////////////////////////
//										Panel Private Methods		  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	/*
	 * Adds the opacity parameter for animation.
	 * 
	 * @param {boolean} visible flag indicating visibility
	 * @param {number} origOpacity the original opacity of the target
	 * @param {jQuery} target the target element
	 * @param {object} animData animation object literal passed to jQuery 
	 * 		animate() method
	 */
	function addOpacityAnim(visible, origOpacity, target, animData) {
		var opacityStart = visible ? 0 : origOpacity,
			opacityEnd = visible ? origOpacity : 0;
		
		animData.opacity = opacityEnd;
		target.css('opacity', opacityStart);
		
		if (visible) {
			target.show();
		}
	};
	
	/*
	 * Adds the location parameter for animation, which is used for sliding
	 * the element.
	 * 
	 * @param {number} destination the x/y position to slide to
	 * @param {object} animData animation object literal passed to jQuery 
	 * 		animate() method
	 */
	function addSlideAnim(destination, animData) {
		var ctn = this.container,
			location;
		
		switch(this.config.location) {
			case editor.ui.Location.TOP:
				location = 'top';
				break;
			case editor.ui.Location.BOTTOM:
				location = 'bottom';
				break;
			case editor.ui.Location.RIGHT:
				location = 'right';
				break;
			default:
				location = 'left';
				break;
		}
		
		var start = parseInt(ctn.css(location)),
			animAmt = '+=' + (destination - start);
		
		animData[location] = animAmt;
	};
	
	/*
	 * Sets the visibility of a panel, using animations if specified
	 * 
	 * @param {boolean} visible flag indicating the new visibility
	 * @param {boolean} opt_skipAnim optional flag indicating whether to 
	 * 		skip the animation 
	 */
	function setVisible(visible, opt_skipAnim) {
		var ctn = this.container,
			btn = this.minMaxBtn,
			animData = {},
			dest = visible ? 0 : -20,
			location;
		
		switch(this.config.location) {
			case editor.ui.Location.TOP:
				location = 'top';
				break;
			case editor.ui.Location.BOTTOM:
				location = 'bottom';
				break;
			case editor.ui.Location.RIGHT:
				location = 'right';
				break;
			default:
				location = 'left';
				break;
		}
		
		if (visible) {
			if (!btn.data('min')) {
				// The container was minimized, we need to rebind handlers
				ctn.bind('mouseenter', showMinMaxBtn)
				.bind('mouseleave', hideMinMaxBtn);
			}
			
			btn.data('min', true).text('Min').hide();
		} else {
			// Check if it is already hidden
			var pos = parseInt(ctn.css(location));
			opt_skipAnim = opt_skipAnim || pos < dest;
		}
		
		if (opt_skipAnim) {
			if (visible) {
				ctn.css(location, dest).css('opacity', this.origOpacity).show();
				btn.css(location, dest);
			}
			else {
				ctn.css(location, dest).css('opacity', 0).hide();
				btn.css(location, dest);
			}
		} else {
			addOpacityAnim(visible, this.origOpacity, ctn, animData, ctn);
			addSlideAnim.call(this, dest, animData);
			
			ctn.animate(animData, function() {
				if (!visible) {
					ctn.hide();
				}
			});
		}
	};

	/*
	 * Hides the min/max button of a panel
	 * 
	 * @param {Object} evt
	 */
	function hideMinMaxBtn(evt) {
		var btn = jQuery(this).find('button.minMax'),
			animData = {};
		
		addOpacityAnim(false, btn.data('origOpacity'), btn, animData);
		btn.animate(animData, function() {
			btn.hide();
		});
	};
	
	function showMinMaxBtn(evt) {
		var btn = jQuery(this).find('button.minMax'),
			animData = {};
		
		addOpacityAnim(true, btn.data('origOpacity'), btn, animData);
		btn.animate(animData);
	};

////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   	  			 Tab Bar			  		                      //	
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var NavBar = function() {
		this.panes = new Hashtable();
		this.visiblePane = null;
		
		PanelBase.call(this, {
			location: 3		// LEFT
		});
	};
	var navBarSuper = PanelBase.prototype;
		
	NavBar.prototype = new PanelBase({ extending: true });
	NavBar.prototype.constructor = NavBar;
		
	NavBar.prototype.layout = function() {
		navBarSuper.layout.call(this);

		var title = jQuery('<h1><span>World</span><span class="editor">Editor</span></h1>');
		this.list = jQuery('<ul></ul>');
		this.container.attr('id', 'navBar').append(title).append(this.list);
		this.resize();
	};
	
	NavBar.prototype.add = function(navPane, opt_liId) {			
		var li = jQuery('<li></li>'),
			ui = navPane.getUI(),
			wgt = this;
		
		if (opt_liId != null) {
			li.attr('id', opt_liId);
		}
		li.append(ui);
		ui.find('a').bind('click', function(evt) {
			if (wgt.visiblePane && wgt.visiblePane !== navPane) {
				wgt.visiblePane.setVisible(false);
			}
			
			navPane.setVisible(!navPane.isVisible());
			
			if (navPane.isVisible()) {
				wgt.visiblePane = navPane;
			} else {
				wgt.visiblePane = null;
			}
		});
		
		this.list.append(li); 
		this.panes.put(navPane.title, {
			li: li,
			pane: navPane
		});
		
		navPane.addListener(editor.events.Enabled, function(data) {
			var obj = wgt.panes.get(data.item);
			
			if (data.enabled) {
				obj.li.show();
			}
			else {
				obj.pane.setVisible(false, function() {						
					obj.li.hide();
				});
			}
		});
	};
	
	NavBar.prototype.get = function(title) {
		var obj = this.panes.get(title);
		return obj != null ? obj.pane : obj;
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   	 			  Tab Pane			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var NavPane = editor.ui.NavPane = function(title, options) {	
		this.toolbar = null;
		this.title = title;
		this.visible = false;
		
		editor.ui.Component.call(this, options);
	};
		
	NavPane.prototype = new editor.ui.Component();
	NavPane.prototype.constructor = editor.ui.NavPane;
		
	NavPane.prototype.layout = function() {
		this.toolbarContainer = jQuery('<div class="toolbarContainer"></div>');
		this.toolbarContainer.hide();
		this.container = jQuery('<div></div>');
		this.titleElem = jQuery('<h2><a href="#">' + this.title + '</a></h2>');
		
		this.container.append(this.titleElem)
		.append(this.toolbarContainer);
	};
	
	NavPane.prototype.add = function(toolView) {
		this.toolbar.add(toolView);
	};
	
	NavPane.prototype.isVisible = function() {
		return this.visible;
	};
	
	NavPane.prototype.notify = function(eventType, value) {
		switch (eventType) {
			case editor.events.Enabled:
				this.setEnabled(value.enabled); 
				break;
		}
	};
	
	NavPane.prototype.remove = function(toolView) {
		this.toolbar.remove(toolView);
	};
	
	NavPane.prototype.setEnabled = function(enabled) {
		this.notifyListeners(editor.events.Enabled, {
			item: this.title,
			enabled: enabled
		});
	};
	
	NavPane.prototype.setToolBar = function(toolbar) {
		this.toolbar = toolbar;
		var ui = toolbar.getUI();
		this.toolbarContainer.append(ui);
		
		this.toolbar.addListener(editor.events.Enabled, this);
	};
	
	NavPane.prototype.setVisible = function(visible, opt_callback) {
		if (visible) {
			this.toolbarContainer.slideDown(function() {
				if (opt_callback) {
					opt_callback();
				}
			});
			this.toolbar.loadState();
			this.container.addClass('down');
			this.visible = true;
		}
		else {
			this.toolbarContainer.slideUp(function() {
				if (opt_callback) {
					opt_callback();
				}
			});
			this.toolbar.saveState();
			this.container.removeClass('down');
			this.visible = false;
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   	  				Panel			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var Panel = editor.ui.Panel = function(options) {
		this.widgets = [];
		options = options || {};
		
		if (options.classes) {
			options.classes.unshift('panel');
		} else {
			options.classes = ['panel'];
		}
		
		PanelBase.call(this, options);
	};
	var panelSuper = PanelBase.prototype;
		
	Panel.prototype = new PanelBase({ extending: true });
	Panel.prototype.constructor = Panel;
		
	Panel.prototype.finishLayout = function() {
		panelSuper.finishLayout.call(this);

		this.setVisible(false, true);
	};
	
	Panel.prototype.addWidget = function(widget) {
		this.container.append(widget.getUI());
		this[widget.getName()] = widget;
		this.widgets.push(widget);
		
		widget.setMinHeight(parseInt(this.container.css('min-height')));
	};
	
	Panel.prototype.resize = function() {
		panelSuper.resize.call(this);
		
		for (var i = 0, il = this.widgets.length; i < il; i++) {
			this.widgets[i].sizeAndPosition();	
		}
	};
	
	Panel.prototype.setVisible = function(visible, opt_skipAnim) {
		if (visible !== this.visible) {
			panelSuper.setVisible.call(this, visible, opt_skipAnim);
			
			for (var i = 0, il = this.widgets.length; i < il; i++) {
				this.widgets[i].sizeAndPosition();	
			}
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//												  Full Panel		  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var FullPanel = editor.ui.FullPanel = function(options) {
		options = options || {};
		options.minMax = false;
		
		if (options.classes) {
			options.classes.unshift('fullPanel');
		} else {
			options.classes = ['fullPanel'];
		}
		
		Panel.call(this, options);
	};
		
	FullPanel.prototype = new Panel({ extending: true });
	FullPanel.prototype.constructor = FullPanel;
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   	  				Widget			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	editor.ui.WidgetDefaults = {
		classes: [],
		height: editor.ui.Height.HALF,
		name: 'defaultName'
	};
	
	var Widget = editor.ui.Widget = function(options) {
		var newOpts = jQuery.extend({}, editor.ui.WidgetDefaults, options);
		
		if (newOpts.classes) {
			newOpts.classes.unshift('widget');
		} else {
			newOpts.classes = ['widget'];
		}
		
		this.minHeight = null;
		editor.ui.Component.call(this, newOpts);
	};
	var widgetSuper = editor.ui.Component.prototype;
		
	Widget.prototype = new editor.ui.Component();
	Widget.prototype.constructor = Widget;
		
	Widget.prototype.layout = function() {
		if (!this.container) {
			this.container = jQuery('<div></div>');
		}
	};
	
	Widget.prototype.finishLayout = function() {
		for (var i = 0, il = this.config.classes.length; i < il; i++) {
			this.container.addClass(this.config.classes[i]);
		}
		
		// make sure forms are widget forms
		this.find('form').addClass('widgetForm').submit(function() {
			return false;
		});
		this.sizeAndPosition();
	};
	
	Widget.prototype.getName = function() {
		return this.config.name;
	};
	
	Widget.prototype.getPreferredHeight = function() {
		return this.preferredHeight;
	};
	
	Widget.prototype.invalidate = function() {
		this.sizeAndPosition();
	};
	
	Widget.prototype.setMinHeight = function(pnlHeight) {
		this.minHeight = pnlHeight;
	};
	
	Widget.prototype.setVisible = function(visible) {
		widgetSuper.setVisible.call(this, visible);
		var wgt = this;
		
		this.notifyListeners(editor.events.WidgetVisible, {
			widget: wgt,
			visible: visible
		});
	};
	
	Widget.prototype.sizeAndPosition = function() {
		var container = this.container,
			padding = parseInt(container.css('paddingBottom')) +
				parseInt(container.css('paddingTop')),
			win = jQuery(window),
			winHeight = this.minHeight ? Math.max(win.height(), this.minHeight) : win.height();
		
		switch(this.config.height) {
			case editor.ui.Height.FULL:
				container.height(winHeight - padding);
				break;
			case editor.ui.Height.HALF:
				container.height(winHeight/2 - padding);
				break;
			case editor.ui.Height.THIRD:
				container.height(winHeight/3 - padding);
				break;
			case editor.ui.Height.MANUAL:
				break;
		}
		
		// check scrollHeight
		if (container[0].scrollHeight > container.height() + padding) {
			container.addClass('hasScrollBar');
		}
		else {
			container.removeClass('hasScrollBar');
		}
	};
   
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     		  				Convenient Forms Widget			                   	  //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	var FormWidget = editor.ui.FormWidget = function(options) {
		this.checkers = [];
		options = options || {};
		
		if (options.classes) {
			options.classes.unshift('widgetWithForms');
		} else {
			options.classes = ['widgetWithForms'];
		}
		
	    Widget.call(this, options);
	};
		
	FormWidget.prototype = new Widget();
	FormWidget.prototype.constructor = FormWidget;
		
	FormWidget.prototype.addInputsToCheck = function(inputs) {
		var wgt = this;
		
		if (inputs instanceof editor.ui.ColorPicker) {
			var checker = {
				input: inputs,
				saveable: function() {
					return this.input.getColor() != null;
				}
			};
			this.checkers.push(checker);
		}
		else if (inputs instanceof editor.ui.Input || inputs instanceof editor.ui.Vector) {
			var checker = {
				input: inputs,
				saveable: function() {
					return this.input.getValue() != null;
				}
			};
			this.checkers.push(checker);
		}
		else if (inputs instanceof editor.ui.InputChecker) {
			this.checkers.push(inputs);
		}
		else if (inputs.each){
			inputs.each(function(ndx, elem) {
				var input = jQuery(elem),
					checker = {
							input: input,
							saveable: function() {
								return this.input.val() !== '';
							}
						};
				wgt.checkers.push(checker);
			});
		}
	};
	
	FormWidget.prototype.checkSaveable = function() {
		var list = this.checkers,
			isSafe = true;
		
		for (var ndx = 0, len = list.length; ndx < len && isSafe; ndx++) {
			isSafe = list[ndx].saveable();
		}
		
		return isSafe;
	};
	
	editor.ui.InputChecker = function(input) {
		this.input = input;
	};
	
	editor.ui.InputChecker.prototype = {
		saveable: function() {
			
		}
	};
   
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     		   				Convenient List Widget			                   	  //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	/*
	 * Configuration object for the ListWidget.
	 */
	editor.ui.ListWidgetDefaults = {
		name: 'listSBWidget',
		listId: 'list',
		prefix: 'lst',
		title: '',
		instructions: '',
		type: editor.ui.ListType.UNORDERED,
		sortable: false
	};
	
	var ListWidget = editor.ui.ListWidget = function(options) {
		var newOpts = jQuery.extend({}, editor.tools.ListWidgetDefaults, options);
	    editor.ui.Widget.call(this, newOpts);
		
		this.items = new Hashtable();		
	};
	var listWidgetSuper = Widget.prototype;
		
	ListWidget.prototype = new Widget();
	ListWidget.prototype.constructor = ListWidget;
			    
    ListWidget.prototype.add = function(obj) {			
		var li = this.items.get(obj.getId());
		
		if (!li) {
			li = this.createListItem();
				
			li.setText(obj.name);
			li.attachObject(obj);
			
			this.bindButtons(li, obj);
			
			this.list.add(li);
			this.items.put(obj.getId(), li);
		}
		
		return li;
    };
	
    ListWidget.prototype.bindButtons = function(li, obj) {
		var wgt = this;
		
		li.editBtn.bind('click', function(evt) {
			var obj = li.getAttachedObject();
			wgt.notifyListeners(editor.events.Edit, obj);
		});
		
		li.removeBtn.bind('click', function(evt) {
			var obj = li.getAttachedObject();
			
			if (editor.depends.check(obj)) {
				wgt.notifyListeners(editor.events.Remove, obj);
			}
		});
	};
	
	ListWidget.prototype.clear = function() {
		this.list.clear();
		this.items.clear();
	};
	
	ListWidget.prototype.createListItem = function() {
		return new editor.ui.EditableListItem();
	};
	
	ListWidget.prototype.layout = function() {
		listWidgetSuper.layout.call(this);
		this.title = jQuery('<h1>' + this.config.title + '</h1>');
		this.instructions = jQuery('<p>' + this.config.instructions + '</p>');
		
		this.list = new editor.ui.List({
			id: this.config.listId,
			prefix: this.config.prefix,
			type: this.config.type,
			sortable: this.config.sortable
		});
		
		this.container.append(this.title)
		.append(this.instructions)
		.append(this.list.getUI());
	};
    
    ListWidget.prototype.remove = function(obj) {
		var li = this.items.get(obj.getId()),
			retVal = false;
		
		if (li) {
			li.removeObject();
			this.list.remove(li);
			this.items.remove(obj.getId());
			retVal = true;
		}
		
		return retVal;
    };
	
	ListWidget.prototype.update = function(obj) {
		var li = this.items.get(obj.getId()),
			retVal = false;
		
		if (li) {
			li.setText(obj.name);
			li.attachObject(obj);
			retVal = true;
		}
		
		return retVal;
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  Private Module Vars and Functions   		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	function resize() {		
		var bdy = jQuery('body'),
			win = jQuery(window),
			vwr = jQuery('.mainView'),
		
			windowWidth = win.width(),
			windowHeight = win.height();
			
		if (windowWidth <= 1024) {
			bdy.addClass('ten24');
			windowWidth = 1024;
		}
		else {
			bdy.removeClass('ten24');
		}
		
		if (windowHeight <= 728) {
			windowHeight = 728;
			if (!bdy.hasClass('ten24')) {
				bdy.addClass('ten24');
			}
		}
		
		vwr.width(windowWidth);
		vwr.height(windowHeight);
		
		for (var i = 0, il = panels.length; i < il; i++) {
			panels[i].resize();
		}
		
		// Unfortunately we also have to do this O3D-specific resizing
		var cans = vwr.find('canvas');
		
		cans.attr('width', windowWidth);
		cans.attr('height', windowHeight);
		// For some reason, textBaseline gets reset when canvas is resized
//		hemi.hud.hudMgr.canvas.textBaseline = 'top';
	};
		
	var navBar = null;
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			   			Public Functions		  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	editor.ui.addNavPane = function(navPane, opt_liId) {
		navBar.add(navPane, opt_liId);
	};
	
	editor.ui.getNavBar = function() {
		return navBar;
	};
	
	editor.ui.getNavPane = function(title) {
		var navPane = navBar.get(title);
		
		if (!navPane) {
			navPane = new editor.ui.NavPane(title);
			navPane.setToolBar(new editor.ui.ToolBar());
			navBar.add(navPane);
		}
		
		return navPane;
	};
	
	editor.ui.initializeView = function(client) {
		var bdy = jQuery('body');
		
		client.setBGColor(0xffffff, 1);
		
		// create and size the webgl client
		// create the grid plane
//		grid = new editor.ui.GridPlane(EXTENT, FIDELITY);
		// create the plugin panel
		navBar = new NavBar();
			
		var cam = client.camera;
		cam.enableControl();
		cam.far = FARPLANE;
		cam.near = NEARPLANE;
//		cam.updateProjection();
        
		var vp = new hemi.Viewpoint();
		vp.eye = new THREE.Vector3(0, 10, 40);
		vp.target = new THREE.Vector3(0, 0, 0);
        cam.moveToView(vp, 0);
		
		// add resizing functionality
		jQuery(window).resize(resize);
		
		// do an initial resize
		resize();
		
		// add an empty panel for select boxes
		bdy.append('<div class="topBottomSelect"></div>');
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	var ProgressIndicator = function() {		
		editor.ui.Component.call(this);	
		this.progress = -1;
	};
		
	ProgressIndicator.prototype = new editor.ui.Component();
	ProgressIndicator.prototype.constructor = ProgressIndicator;
		
	ProgressIndicator.prototype.layout = function() {
		this.container = jQuery('<div id="progressIndicator"></div>');
		this.text = jQuery('<span class="prgBarText">Loading...</span>');
		this.barWrapper = jQuery('<div class="prgBarContainer"></div>');
		this.indicator = jQuery('<div class="prgBarIndicator"></div>');
	
		this.barWrapper.append(this.indicator);
		this.container.append(this.text).append(this.barWrapper);
		
		this.container.css('zIndex', editor.ui.Layer.DIALOG);
		// immediately update
		this.update(0);
		hemi.subscribe(hemi.msg.progress, this, 'msgUpdate');
	};
	
	/**
	 * Callback for the hemi.msg.progress message type.  Only listens for
	 * the total progress information and updates the progress bar UI 
	 * accordingly.
	 * 
	 * @param {Object} progressMsg the message data received from the 
	 * 				   message dispatcher.
	 */
	ProgressIndicator.prototype.msgUpdate = function(progressMsg) {
		var progressInfo = progressMsg.data,
			percent = this.progress;
		
		if (progressInfo.isTotal) {
			percent = progressInfo.percent;
			this.update(percent);
		}
	};
	
	ProgressIndicator.prototype.setVisible = function(visible) {
		var ctn = this.container;
		
		if (visible) {
			var	windowHeight = jQuery(window).height(),
				windowWidth = window.innerWidth ? window.innerWidth 
					: document.documentElement.offsetWidth,
				top = windowHeight - ctn.height(),
				left = (windowWidth - ctn.width())/2;
							
			ctn.show().css({
				top: top + 20 + 'px',
				left: left + 'px',
				opacity: 0,
				position: 'absolute'
			}).animate({
				opacity: 1,
				top: '-=20'
			}, 300);
		}
		else {
			ctn.animate({
				opacity: 0,
				top: '+=20'
			}, 400, function(){
				ctn.hide();
			});
		}
	};
	
	/**
	 * Updates the progress bar with the given progress.
	 * 
	 * @param {number} progress the progress in percent.
	 */
	ProgressIndicator.prototype.update = function(progress) {
		if (this.progress !== progress) {
			if (!this.isVisible()) {
				this.setVisible(true);
			}
			var wgt = this;
			this.progress = progress;
			
			// update the ui
			this.indicator.width(this.barWrapper.width() * progress/100);
			
			// if percent is 100, stop drawing this
			if (this.progress >= 99.9) {
				setTimeout(function() {
					wgt.progress = -1;
					wgt.setVisible(false);
				}, 100);
			}
		}
	};

	editor.ui.progressUI = new ProgressIndicator();
	
	jQuery(document).bind('ready', function() {
		jQuery('body').append(editor.ui.progressUI.getUI());
		editor.ui.progressUI.container.hide();
	});
	
})(editor);
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

(function(editor) {
	"use strict";
	
    editor.ui = editor.ui || {};
	editor.ui.trans = editor.ui.trans || {};
	
	var EXTENT = 5,
		MAX_EXTENT = 10,
		MIN_EXTENT = 4;
	
	editor.ui.trans.DrawState = {
		TRANSLATE: 0,
		ROTATE: 1,
		SCALE: 2,
		NONE: 3
	};
	
	var TransHandles = editor.ui.TransHandles = function() {
		editor.utils.Listenable.call(this);
		this.canvas = hemi.hud.hudMgr.canvas;
		this.drawCallback = null;
		this.transform = null;
		
		this.xArrow = new Arrow(this.canvas, '#f00', '#f99');
		this.yArrow = new Arrow(this.canvas, '#0c0', '#9c9');
		this.zArrow = new Arrow(this.canvas, '#00f', '#99f');
		this.drawState = editor.ui.trans.DrawState.NONE;
		
		hemi.view.addRenderListener(this);
		this.overrideHandlers();
	};
		
	TransHandles.prototype = new editor.utils.Listenable();
	TransHandles.prototype.constructor = TransHandles;
		
	TransHandles.prototype.cleanup = function() {
		this.setDrawState(editor.ui.trans.DrawState.NONE);
		this.setTransform(null);
		hemi.view.removeRenderListener(this);
		
		var mouseDown = hemi.hud.hudMgr.downHandler,
			mouseUp = hemi.hud.hudMgr.upHandler,
			mouseMove = hemi.hud.hudMgr.moveHandler,
			that = this,
			cvs = hemi.hud.hudMgr.canvasElem;
			
		cvs.removeEventListener('mousedown', this.mouseDownHandler, true);
		cvs.removeEventListener('mousemove', this.mouseMoveHandler, true);
		cvs.removeEventListener('mouseup', this.mouseUpHandler, true);
		
		cvs.addEventListener('mousedown', mouseDown, true);
		cvs.addEventListener('mousemove', mouseUp, true);
		cvs.addEventListener('mouseup', mouseMove, true);
		jQuery(document).unbind('mouseup.transhandles');
	};
	
	TransHandles.prototype.drawHandles = function() {
		if (this.drawState !== editor.ui.trans.DrawState.NONE) {
//				var origin = this.transform.localMatrix[3],		FOR LOCAL
			var origin = this.transform.boundingBox.getCenterOfGeometry(), 
				extent = this.getExtent() / 2,
				x = origin[0], 
				y = origin[1], 
				z = origin[2], 
//					u = hemi.utils,	 FOR LOCAL
//					xVec = u.pointAsWorld(this.transform, [x + extent, y, z]),	 FOR LOCAL
//					yVec = u.pointAsWorld(this.transform, [x, y + extent, z]),	 FOR LOCAL 
//					zVec = u.pointAsWorld(this.transform, [x, y, z + extent]);	 FOR LOCAL
				xVec = [x + extent, y, z], 
				yVec = [x, y + extent, z], 
				zVec = [x, y, z + extent];
			
			this.xArrow.setParams(origin, xVec,  
				hemi.manip.Plane.XY, this.drawState, extent);
			this.yArrow.setParams(origin, yVec,  
				hemi.manip.Plane.YZ, this.drawState, extent);
			this.zArrow.setParams(origin, zVec,  
				hemi.manip.Plane.XZ, this.drawState, extent);
		}
	};
	
	TransHandles.prototype.convertEvent = function(evt) {
		var elem = jQuery(evt.target ? evt.target : evt.srcElement),
			offset = elem.offset();
		evt.x = evt.pageX - offset.left;
		evt.y = evt.pageY - offset.top;
		
		return evt;
	};
	
	TransHandles.prototype.getExtent = function() {
		var bdgBox = o3djs.util.getBoundingBoxOfTree(this.transform),
//				minExt = bdgBox.minExtent,	FOR LOCAL
//				maxExt = bdgBox.maxExtent,	FOR LOCAL
			minExt = hemi.utils.pointAsWorld(this.transform.parent, bdgBox.minExtent),
			maxExt = hemi.utils.pointAsWorld(this.transform.parent, bdgBox.maxExtent),
			x = Math.abs(minExt[0] - maxExt[0]),
			y = Math.abs(minExt[1] - maxExt[1]),
			z = Math.abs(minExt[2] - maxExt[2]),
			realExt = (x + y + z) / 3;
			
		return realExt < MIN_EXTENT ? MIN_EXTENT : realExt;
	};
	
	TransHandles.prototype.isInView = function() {
		var worldViewProjection = [[], [], [], []],
			transform = this.transform,
			bdgBox = this.transform.boundingBox;
    	
		o3d.Transform.compose(hemi.view.viewInfo.drawContext.view,
			transform.getUpdatedWorldMatrix(),
			worldViewProjection);
    	o3d.Transform.compose(hemi.view.viewInfo.drawContext.projection,
			worldViewProjection,
			worldViewProjection);

		var onScreen = transform.boundingBox.inFrustum(worldViewProjection);

		return onScreen;
	};
	
	TransHandles.prototype.onChange = function(val) {
		var that = this;
		
		this.notifyListeners(editor.events.Updated, {
			tran: that.transform,
			delta: val
		});
	};
	
	TransHandles.prototype.onMouseDown = function(evt) {
		if (!this.transform 
				|| this.drawState === editor.ui.trans.DrawState.NONE) {
			return false;
		}
		
		var x = evt.x,
			y = evt.y,
			plane,
			axis,
			scaleAxis;
			
		if (this.xArrow.isInside(x, y)) {
			this.down = true;
			plane = hemi.manip.Plane.XY;
			axis = hemi.manip.Axis.Z;
			scaleAxis = hemi.manip.Axis.X;
		}
		else if (this.yArrow.isInside(x, y)) {
			this.down = true;
			plane = hemi.manip.Plane.YZ;
			axis = hemi.manip.Axis.X;
			scaleAxis = hemi.manip.Axis.Y;
		}
		else if (this.zArrow.isInside(x, y)) {
			this.down = true;	
			plane = hemi.manip.Plane.XZ;
			axis = hemi.manip.Axis.Y;
			scaleAxis = hemi.manip.Axis.Z;
		}
		
		if (this.down) {
			switch(this.drawState) {
				case editor.ui.trans.DrawState.ROTATE:
					this.startRotate(axis, evt);
					break;
				case editor.ui.trans.DrawState.SCALE:
					this.startScale(scaleAxis, evt);
					break;
				case editor.ui.trans.DrawState.TRANSLATE:
				    this.startTranslate(plane, evt);
					break;
			}			
			return true;
		}
		
		return false;
	};
	
	TransHandles.prototype.onMouseMove = function(evt) {
		if (!this.transform || this.down
				|| this.drawState === editor.ui.trans.DrawState.NONE) {
			return false;
		}
		
		var x = evt.x,
			y = evt.y,
			hovered = false;
				
		this.xArrow.hover = false;
		this.yArrow.hover = false;
		this.zArrow.hover = false;
		
		if (this.xArrow.isInside(x, y)) {
			hovered = this.xArrow.hover = true;
		}
		else if (this.yArrow.isInside(x, y)) {
			hovered = this.yArrow.hover = true;
		}
		else if (this.zArrow.isInside(x, y)) {
			hovered = this.zArrow.hover = true;
		}
		
		return hovered;
	};
	
	TransHandles.prototype.onMouseUp = function(evt) {
		if (!this.down) {
			return false;
		}
		
		this.down = false;
		if (this.dragger) {
			this.dragger.cleanup();
			this.dragger = null;
		}
		if (this.turnable) {
			this.turnable.cleanup();
			this.turnable = null;
		}
		if (this.scalable) {
			this.scalable.cleanup();
			this.scalable = null;
		}
		hemi.world.camera.enableControl();
		
		// make the changes octanable
		var param = this.transform.getParam('ownerId');
		
		if (param) {
			owner = hemi.world.getCitizenById(param.value);
			
			if (owner.setTransformMatrix) {
				owner.setTransformMatrix(this.transform, 
					this.transform.localMatrix);
			} else if (owner.setMatrix) {
				owner.setMatrix(this.transform.localMatrix);
			}
		}
		
		return true;
	};
	
	TransHandles.prototype.onRender = function(renderEvent) {
		if (this.transform) {
			hemi.hud.hudMgr.clearDisplay();
			
			if (this.drawCallback) {
				this.drawCallback();
			}
			
			this.drawHandles();
		}
	};
	
	TransHandles.prototype.overrideHandlers = function() {
		var mouseDown = hemi.hud.hudMgr.downHandler,
			mouseUp = hemi.hud.hudMgr.upHandler,
			mouseMove = hemi.hud.hudMgr.moveHandler,
			that = this,
			cvs = hemi.hud.hudMgr.canvasElem;
			
		cvs.removeEventListener('mousedown', mouseDown, true);
		cvs.removeEventListener('mousemove', mouseMove, true);
		cvs.removeEventListener('mouseup', mouseUp, true);
			
		this.mouseDownHandler = function(evt) {
			// Create a writeable clone of the event and convert it
			var wrEvt = hemi.utils.clone(evt, false);
			that.convertEvent(wrEvt);
			
			if (!that.onMouseDown(wrEvt)) {
				// Give the original handler the original event
				mouseDown(evt);
			}
		};
		this.mouseUpHandler = function(evt) {
			var wrEvt = hemi.utils.clone(evt, false);
			that.convertEvent(wrEvt);
			
			if (!that.onMouseUp(wrEvt)) {
				mouseUp(evt);
			}
		};
		this.mouseMoveHandler = function(evt) {
			var wrEvt = hemi.utils.clone(evt, false);
			that.convertEvent(wrEvt);
			
			if (!that.onMouseMove(wrEvt)) {
				mouseMove(evt);
			}
		};
		
		cvs.addEventListener('mousedown', this.mouseDownHandler, true);
		cvs.addEventListener('mousemove', this.mouseMoveHandler, true);
		cvs.addEventListener('mouseup', this.mouseUpHandler, true);
		jQuery(document).bind('mouseup.transhandles', function(evt) {
			that.onMouseUp(evt);
		});
	};
	
	TransHandles.prototype.setDrawCallback = function(callback) {
		this.drawCallback = callback;
	};
	
	TransHandles.prototype.setDrawState = function(state) {
		this.drawState = state;
		// make sure the render handler is called at least once
		this.onRender();
	};
	
	TransHandles.prototype.setTransform = function(transform) {
		if (transform && hemi.utils.isAnimated(transform)) {
			this.transform = null;
			
			if (this.drawState !== editor.ui.trans.DrawState.NONE) {
				hemi.hud.hudMgr.clearDisplay();
			}
		} else {
			this.transform = transform;
		}
		// make sure the render handler is called at least once
		this.onRender();
	};
	
	TransHandles.prototype.startRotate = function(axis, evt) {
		hemi.world.camera.disableControl();
		this.turnable = new hemi.manip.Turnable(axis);
		this.turnable.addTransform(this.transform);
		this.turnable.enable();
		
		this.turnable.onPick({
			shapeInfo: {
				parent: {
					transform: this.transform
				}
			}
		}, evt);
	};
	
	TransHandles.prototype.startScale = function(axis, evt) {
		hemi.world.camera.disableControl();
		this.scalable = new hemi.manip.Scalable(axis);
		this.scalable.addTransform(this.transform);
		this.scalable.subscribe(
			hemi.msg.scale,
			this,
			"onChange",
			[
				hemi.dispatch.MSG_ARG + "data.scale"
			]);
		
		
		if (evt.shiftKey) {
			this.scalable.axis = [1, 1, 1];
		}
		
		this.scalable.enable();
		
		this.scalable.onPick({
			shapeInfo: {
				parent: {
					transform: this.transform
				}
			}
		}, evt);
	};
	
	TransHandles.prototype.startTranslate = function(plane, evt) {
		hemi.world.camera.disableControl();		
		this.dragger = new hemi.manip.Draggable();
		this.dragger.name = editor.ToolConstants.EDITOR_PREFIX + 'Dragger';
		this.dragger.setPlane(plane);
		this.dragger.subscribe(
			hemi.msg.drag,
			this,
			"onChange",
			[
				hemi.dispatch.MSG_ARG + "data.drag"
			]);
		
		switch(plane) {
			case hemi.manip.Plane.XY:
			    this.dragger.vmin = this.dragger.vmax = 0;
				break;
			case hemi.manip.Plane.YZ:
			    this.dragger.umin = this.dragger.umax = 0;
				break;
			case hemi.manip.Plane.XZ:
			    this.dragger.umin = this.dragger.umax = 0;
				break;
		}

        this.dragger.addTransform(this.transform);
		
		this.dragger.onPick({
			shapeInfo: {
				parent: {
					transform: this.transform
				}
			}
		}, evt);
	};
	
	var Arrow = function(canvas, color, hoverColor) {
		this.canvas = canvas;
		this.clr = color;
		this.hvrClr = hoverColor;
		this.math = hemi.core.math;
	};
	
	Arrow.prototype.isInside = function(coordX, coordY) {
		return coordX >= this.topLeft[0] && coordX <= this.bottomRight[0]
			&& coordY >= this.topLeft[1] && coordY <= this.bottomRight[1];
	};
	
	Arrow.prototype.drawLine = function() {	
		var cvs = this.canvas,
			cfg = this.config;
		cvs.beginPath();
		cvs.moveTo(cfg.orgPnt[0], cfg.orgPnt[1]);
		cvs.lineTo(cfg.endPnt[0], cfg.endPnt[1]);
		cvs.strokeStyle = this.hover ? this.hvrClr : this.clr;
		cvs.lineWidth = cfg.lineWidth;
		cvs.stroke();
	};
			
	Arrow.prototype.drawRotater = function() {
		var cfg = this.config,
			origin = cfg.origin,
			vector = cfg.vector,
			increment = Math.PI / 90,  // 2 degrees
			startAngle = Math.PI / 2,
			radius = cfg.extent,
			angles = [
				startAngle - increment * 3,
				startAngle - increment * 2,
				startAngle - increment,
				startAngle,
				startAngle + increment,
				startAngle + increment * 2,
				startAngle + increment * 3		
			],
			cvs = this.canvas,
			pnt1,
			pnt2;
		
		cvs.beginPath();
		// sample points on a circle in 3d space
		for (var ndx = 0, len = angles.length; ndx < len; ndx++) {
			var a = angles[ndx],
				pnt = hemi.core.math.copyVector(origin); 
				
			switch(cfg.plane) {
				case hemi.manip.Plane.XY:
					pnt[1] = origin[1] + radius * Math.cos(a);
					pnt[0] = origin[0] + radius * Math.sin(a);
					break;
				case hemi.manip.Plane.YZ:
					pnt[2] = origin[2] + radius * Math.cos(a);
					pnt[1] = origin[1] + radius * Math.sin(a);
					break;
				case hemi.manip.Plane.XZ:
					pnt[0] = origin[0] + radius * Math.cos(a);
					pnt[2] = origin[2] + radius * Math.sin(a);
					break;
			}
			
			pnt = hemi.utils.worldToScreen(pnt);
			if (ndx === 0) {
				cvs.moveTo(pnt[0], pnt[1]);
				pnt1 = pnt;
			}
			else if (ndx === len-1) {
				pnt2 = pnt;
			}
			cvs.lineTo(pnt[0], pnt[1]);
		}
		cvs.strokeStyle = this.hover ? this.hvrClr : this.clr;
		cvs.lineWidth = cfg.lineWidth * 3;
		cvs.lineCap = 'round';
		cvs.stroke();
		
		// save coordinates
		var x1 = pnt1[0],
			x2 = pnt2[0],
			y1 = pnt1[1],
			y2 = pnt2[1],
			minX = Math.min(x1, x2),
			minY = Math.min(y1, y2),
			maxX = Math.max(x1, x2),
			maxY = Math.max(y1, y2);
			
		if (Math.abs(x1 - x2) < 5) {
			maxX = minX + 5;
		}
		if (Math.abs(y1 - y2) < 5) {
			maxY = minY + 5;
		}
			
		this.topLeft = [minX, minY];
		this.bottomRight = [maxX, maxY];
	};
	
	Arrow.prototype.drawScaler = function() {
		var cfg = this.config,
			origin = cfg.origin,
			vector = cfg.vector,
			size = cfg.extent / 8,  
			points = [],
			cvs = this.canvas,
			clr = this.hover ? this.hvrClr : this.clr,
			cubeFcn = function(ndx1, ndx2, ndx3) {
				var pnt1 = hemi.core.math.copyVector(vector),
					pnts = [];
				pnt1[ndx1] = vector[ndx1] + size/2;
				pnt1[ndx2] = vector[ndx2] + size/2;
				pnts.push(pnt1);
				
				var pnt2 = hemi.core.math.copyVector(pnt1);
				pnt2[ndx2] -= size;
				pnts.push(pnt2);
				
				var pnt3 = hemi.core.math.copyVector(pnt2);
				pnt3[ndx1] -= size;	
				pnts.push(pnt3);
				
				var pnt4 = hemi.core.math.copyVector(pnt3);
				pnt4[ndx2] += size;
				pnts.push(pnt4);
				
				var pnt = hemi.core.math.copyVector(pnt4);
				pnt[ndx3] += size;
				pnts.push(pnt);
				
				pnt = hemi.core.math.copyVector(pnt3);
				pnt[ndx3] += size;
				pnts.push(pnt);
				
				pnt = hemi.core.math.copyVector(pnt2);
				pnt[ndx3] += size;
				pnts.push(pnt);
				
				pnt = hemi.core.math.copyVector(pnt1);
				pnt[ndx3] += size;
				pnts.push(pnt);
				
				return pnts;
			},
			faceFcn = function(point1, point2, point3, point4) {
				cvs.beginPath();
				cvs.moveTo(point1[0], point1[1]);
				cvs.lineTo(point2[0], point2[1]);
				cvs.lineTo(point3[0], point3[1]);
				cvs.lineTo(point4[0], point4[1]);
				cvs.lineTo(point1[0], point1[1]);
				cvs.closePath();
				cvs.fillStyle = clr;
				cvs.fill();
			};
				
		switch(cfg.plane) {
			case hemi.manip.Plane.XY:
				points = cubeFcn(1, 2, 0);
				break;
			case hemi.manip.Plane.YZ:
				points = cubeFcn(2, 0, 1);
				break;
			case hemi.manip.Plane.XZ:
				points = cubeFcn(0, 1, 2);
				break;
		}
		
		var minX, minY, maxX, maxY;
		
		minX = minY = 10000000;
		maxX = maxY = -10000000;
		
		for (var ndx = 0, len = points.length; ndx < len; ndx++) {
			var pnt = hemi.utils.worldToScreen(points[ndx]);
			
			minX = Math.min(minX, pnt[0]);
			minY = Math.min(minY, pnt[1]);
			maxX = Math.max(maxX, pnt[0]);
			maxY = Math.max(maxY, pnt[1]);
		}
		
		var pnt1 = hemi.utils.worldToScreen(points[0]),
			pnt2 = hemi.utils.worldToScreen(points[1]),
			pnt3 = hemi.utils.worldToScreen(points[2]),
			pnt4 = hemi.utils.worldToScreen(points[3]),
			pnt5 = hemi.utils.worldToScreen(points[4]),
			pnt6 = hemi.utils.worldToScreen(points[5]),
			pnt7 = hemi.utils.worldToScreen(points[6]),
			pnt8 = hemi.utils.worldToScreen(points[7]);
			
		faceFcn(pnt1, pnt2, pnt3, pnt4);
		faceFcn(pnt1, pnt8, pnt5, pnt4);
		faceFcn(pnt1, pnt2, pnt7, pnt8);
		faceFcn(pnt8, pnt7, pnt6, pnt5);
		faceFcn(pnt7, pnt6, pnt4, pnt3);
		faceFcn(pnt4, pnt3, pnt6, pnt5);
							
		this.topLeft = [minX, minY];
		this.bottomRight = [maxX, maxY];
	};
	
	Arrow.prototype.drawTranslator = function() {
		var cfg = this.config,
			origin = cfg.origin,
			vector = cfg.vector,
			increment = Math.PI / 90,  // 2 degrees
			startAngle = Math.PI / 2,
			radius = cfg.extent / 10,
			endPnt = hemi.core.math.copyVector(vector),
			angles = 180,
			angle = 0,
			points = [],
			size = cfg.extent / 5,  
			cvs = this.canvas,
			clr = this.hover ? this.hvrClr : this.clr,
			ndx1 = 0,
			ndx2 = 0,
			getOutsidePoints = function(pnts) {
				var maxDis = 0,
					retVal = {
						pnt1: pnts[0],
						pnt2: pnts[0]
					};
				
				for (var i = 0, l = pnts.length; i < l; i++) {
					var pnt1 = pnts[i];
					
					for (var j = i+1; j < l; j++) {
						var pnt2 = pnts[j],
							dis = hemi.core.math.distance(pnt1, pnt2);	
						
						if (dis > maxDis) {
							maxDis = dis;
							retVal.pnt1 = pnt1;
							retVal.pnt2 = pnt2;
						}
					}
				}
				
				return retVal;
			};
			
		// get the endpoint
		switch(cfg.plane) {
			case hemi.manip.Plane.XY:
				endPnt[0] = vector[0] + size;
				ndx1 = 1;
				ndx2 = 2;
				break;
			case hemi.manip.Plane.YZ:
				endPnt[1] = vector[1] + size;
				ndx1 = 2;
				break;
			case hemi.manip.Plane.XZ:
				endPnt[2] = vector[2] + size;
				ndx1 = 1;
				break;
		}
		endPnt = hemi.utils.worldToScreen(endPnt);
		
		// sample points on a circle in 3d space
		cvs.beginPath();
		for (var ndx = 0; ndx < angles; ndx++) {
			var pnt = hemi.core.math.copyVector(vector);
			
			angle = angle += increment; 
				
			pnt[ndx1] = vector[ndx1] + radius * Math.cos(angle);
			pnt[ndx2] = vector[ndx2] + radius * Math.sin(angle);
			
			pnt = hemi.utils.worldToScreen(pnt);
			if (ndx === 0) {
				cvs.moveTo(pnt[0], pnt[1]);
			}
			cvs.lineTo(pnt[0], pnt[1]);
			
			var x = pnt[0],
				y = pnt[1];
			
			points.push(pnt);
		}
		cvs.closePath();
		cvs.fillStyle = clr;
		cvs.fill();
		
		// draw line from the max points to the end point
		var maxPnts = getOutsidePoints(points),
			pnt1 = maxPnts.pnt1,
			pnt2 = maxPnts.pnt2,
			maxX = Math.max(pnt1[0], pnt2[0], endPnt[0]),
			maxY = Math.max(pnt1[1], pnt2[1], endPnt[1]),
			minX = Math.min(pnt1[0], pnt2[0], endPnt[0]),
			minY = Math.min(pnt1[1], pnt2[1], endPnt[1]);
		
		cvs.beginPath();
		cvs.moveTo(pnt1[0], pnt1[1]);
		cvs.lineTo(pnt2[0], pnt2[1]);
		cvs.lineTo(endPnt[0], endPnt[1]);
		cvs.closePath();
		cvs.fillStyle = clr;
		cvs.fill();
			
		this.topLeft = [minX, minY];
		this.bottomRight = [maxX, maxY];
	};
	
	Arrow.prototype.setParams = function(origin, vector, plane, drawState, extent) {			
		var ep = hemi.utils.worldToScreen(vector),
			op = hemi.utils.worldToScreen(origin),
			d = this.math.distance(op, ep),
			e = hemi.world.camera.getEye(),
			ce = this.math.normalize(this.math.subVector(e, origin)),
			ca = this.math.normalize(this.math.subVector(vector, origin));
			
		if (!isNaN(ce[0]) && !isNaN(ca[0])) {			
			this.config = {
				origin: origin,
				vector: vector,
				orgPnt: op,
				endPnt: ep,
				distance: d,
				centerEye: ce,
				centerArrow: ca,
				plane: plane,
				extent: extent,
				lineWidth: 3
			};
			
			this.drawLine();
			
			switch (drawState) {
				case editor.ui.trans.DrawState.TRANSLATE:
					this.drawTranslator();
					break;
				case editor.ui.trans.DrawState.ROTATE:
					this.drawRotater();
					break;
				case editor.ui.trans.DrawState.SCALE:
					this.drawScaler();
					break;
			}
		}
	};
    
})(editor);
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

(function(editor) {
	editor.ui = editor.ui || {};
	
	var vertShaderVars = "varying float v_alpha;\n" +
			"varying vec4 v_orig_position;\n\n",
		vertShaderFunc = "void setAlpha(vec4 position) {\n" +
			"  float disX = abs(position.x);\n" +
			"  float disZ = abs(position.z);\n" +
			"  float max = float(EXTENT);\n" +
			"  float temp = disX > disZ ? disX / max : disZ / max;\n" +
			"  float powered = temp * temp * temp;\n" +
			"  v_alpha = 1.0 - powered;\n" +
			"  v_orig_position = position;\n" +
			"}\n",
		vertShaderCall = "setAlpha(position);";
			
	var fragShaderVars = "uniform vec4 xAxisColor;\n" +
			"uniform vec4 zAxisColor;\n" +
			"varying float v_alpha;\n" +
			"varying vec4 v_orig_position;\n\n",
		fragShaderFunc = "void checkAxis(vec4 position) {\n" +
			"  float marker = float(MARKER);\n" +
			"  if (position.z == 0.0) {\n" +
			"    gl_FragColor = vec4(xAxisColor.rgb, gl_FragColor.a);\n" +
			"  } else if (position.x == 0.0) {\n" +
			"    gl_FragColor = vec4(zAxisColor.rgb, gl_FragColor.a);\n" +
			"  }\n" +
			"}\n",
		fragShaderCall = "  gl_FragColor = vec4(gl_FragColor.rgb, v_alpha * gl_FragColor.a);\n" +
			"  checkAxis(v_orig_position);\n";
	
	editor.ui.GridPlane = function(extent, fidelity) {
		this.extent = extent;
		this.fidelity = fidelity;
			
		this.createShape();	
		this.modifyShader();	
	};
		
	editor.ui.GridPlane.prototype.createShape = function() {
		var mat = new THREE.ShaderMaterial({
				blending: THREE.BillboardBlending,
				color: 0x666666,
				lighting: false,
				opacity: 0.4,
				wireframe: true
			}),
			markerMat = new THREE.ShaderMaterial({
				blending: THREE.BillboardBlending,
				color: 0x444444,
				lighting: false,
				opacity: 0.8,
				wireframe: true
			}),
			division = this.extent / this.fidelity,
			fullExtent = this.extent * 2,
			marker = this.fidelity * 5,
			markerDivision = this.extent / marker;
		
		// create the actual shape
		var mainPlane = new THREE.Mesh(new THREE.Plane(fullExtent, fullExtent, division, division), 
				mat),
			markerPlane = new THREE.Mesh(new THREE.Plane(fullExtent, fullExtent, markerDivision,
				markerDivision), markerMat);
//		this.transform = hemi.core.mainPack.createObject('Transform');
//		this.transform.addShape(createPlane(fullExtent, fullExtent, division, 
//			division, mat, hemi.core.mainPack));
//		this.transform.addShape(createPlane(fullExtent, fullExtent, 
//			markerDivision, markerDivision, markerMat, hemi.core.mainPack, 0.01));
		
		this.material = mat;
		this.markerMaterial = markerMat;
		this.transform.parent = hemi.core.client.root;
	};
	
	editor.ui.GridPlane.prototype.modifyShader = function() {
		modifyMaterial(this.material, this.extent, this.fidelity * 5.0);	
		modifyMaterial(this.markerMaterial, this.extent, this.fidelity * 5.0);
		
		this.markerMaterial.getParam('xAxisColor').value = [1.0, 0.0, 0.0, 1.0];
		this.markerMaterial.getParam('zAxisColor').value = [0.0, 0.0, 1.0, 1.0];
	};
	
	editor.ui.GridPlane.prototype.setVisible = function(visible) {
		this.transform.visible = visible;
	};

	var modifyMaterial = function(material, extent, marker) {
		var gl = material.gl,
			program = material.effect.program_,
			shad = hemi.utils.getShaders(material),
			fragShd = shad.fragShd,
			fragSrc = shad.fragSrc,
			vertShd = shad.vertShd,
			vertSrc = shad.vertSrc;
			
		if (vertSrc.search('v_alpha') < 0) {			
			vertSrc = hemi.utils.combineVertSrc(vertSrc, {
				postHdr: vertShaderVars,
				postSprt: vertShaderFunc.replace(/EXTENT/g, extent),
				postGlob: vertShaderCall
			});
			
			gl.detachShader(program, vertShd);
			material.effect.loadVertexShaderFromString(vertSrc);
		}
		if (fragSrc.search('v_alpha') < 0) {			
			fragSrc = hemi.utils.combineFragSrc(fragSrc, {
				postHdr: fragShaderVars,
				postSprt: fragShaderFunc.replace(/MARKER/g, marker),
				postGlob: fragShaderCall
			});
			gl.detachShader(program, fragShd);
			material.effect.loadPixelShaderFromString(fragSrc);
		}
			
		material.effect.createUniformParameters(material);
	};
	
	var createPlane = function(width, 
							   depth, 
							   subDivWidth, 
							   subDivDepth, 
							   material, 
							   pack,
							   opt_y) {		
		var vertexInfo = o3djs.primitives.createVertexInfo();
		var positionStream = vertexInfo.addStream(
			3, o3djs.base.o3d.Stream.POSITION);
		var normalStream = vertexInfo.addStream(
			3, o3djs.base.o3d.Stream.NORMAL);
		var texCoordStream = vertexInfo.addStream(
			2, o3djs.base.o3d.Stream.TEXCOORD, 0);
		var y = opt_y || 0;
		
		// Generate the individual vertices in our vertex buffer.
		for (var z = 0; z <= subDivDepth; z++) {
			var v = z / subDivDepth;
			for (var x = 0; x <= subDivWidth; x++) {
				var u = x / subDivWidth;
				positionStream.addElement(width * u - width * 0.5,
					y, depth * v - depth * 0.5);
				normalStream.addElement(0, 1, 0);
				texCoordStream.addElement(u, 1 - v);
			}
		}
		
		var numVertsAcross = subDivWidth + 1;
		
		for (var z = 0; z < subDivDepth; z++) {
			for (var x = 0; x < subDivWidth; x++) {
				vertexInfo.indices.push(z * numVertsAcross + x);
				vertexInfo.indices.push(z * numVertsAcross + x + 1);
				vertexInfo.indices.push((z + 1) * numVertsAcross + x + 1);
				vertexInfo.indices.push((z + 1) * numVertsAcross + x);
				vertexInfo.indices.push(z * numVertsAcross + x);
				vertexInfo.indices.push((z + 1) * numVertsAcross + x);
				vertexInfo.indices.push(z * numVertsAcross + x + 1);
				vertexInfo.indices.push((z + 1) * numVertsAcross + x + 1);
			}
		}						
		
		return vertexInfo.createShapeByType(pack, material, 
			o3djs.base.o3d.Primitive.LINELIST);
	};
	
})(editor);
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

(function(editor) {
	"use strict";
	
	editor.ui = editor.ui || {};
	
	var createSimpleDialog = function(prefix, title) {
		var dlg = jQuery('<div title="' + title + '" id="' + prefix + 'Dlg" class="simpleDialog">\
				<p></p>\
				<form method="post" action="">\
					<label></label>\
				</form>\
			</div>'),
			form = dlg.find('form').submit(function() {
				return false;
			}),
			msg = dlg.find('p').hide(),
			lbl = dlg.find('label');
		
		dlg.data('msg', msg).data('label', lbl).data('form', form);
		
		return dlg;
	};
	
	editor.ui.createDependencyDialog = function(depList) {
		var dlg = createSimpleDialog('showDeps', 'Unable to Remove'),
			form = dlg.data('form').attr('style', 'float:none;'),
			msg = dlg.data('msg').attr('style', 'text-align:left;'),
			list = jQuery('<p style="text-align:left;" id="depList"></p>'),
			btn = jQuery('<button id="okayBtn">Okay</button>');
		
		form.append(list);
		dlg.append(btn);
		msg.text('The following elements depend on this element either directly\
				or indirectly. Please remove or modify them first.');
		list.html(depList);
		
		btn.click(function() {
			dlg.dialog('close');
		});
		dlg.dialog({
			width: 300,
			resizable: false,
			autoOpen: false,
			modal: true
		})
		.bind('dialogopen', function() {
			form.show();
			msg.show();
		});
		
		return dlg;
	};
	
})(editor);
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

(function(editor) {	
	"use strict";
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  				Variables			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////

	editor.ui = editor.ui || {};
	editor.tools = editor.tools || {};
	
	/**
	 * Constants often used by tools.
	 */
	editor.ToolConstants = {
		EDITOR_PREFIX: 'EditorCitizen:',
		MODE_DOWN: 'down',
		MODE_UP: 'up'
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  			  Architecture			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var models = new Hashtable(),
		views = new Hashtable();
		
	editor.getModel = function(name) {
		return models.get(name);
	};
	
	editor.getModels = function() {
		return models.values();
	};
	
	editor.getView = function(name) {
		return views.get(name);
	};	
	
	editor.getViews = function() {
		return views.values();
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  				 Toolbar			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	var ToolBar = editor.ui.ToolBar = function(options) {		
		this.tools = [];
		this.savedTool = null;
		this.mousedIn = [];
		this.hidden = true;
		editor.ui.Component.call(this);
	};

	ToolBar.prototype = new editor.ui.Component();
	ToolBar.prototype.constructor = ToolBar;
		
	ToolBar.prototype.add = function(tool) {
		if (tool instanceof editor.ToolView) {
			this.tools.push({
				tool: tool,
				enabled: true
			});
			this.list.append(createListItem(tool));
			
			tool.addListener(editor.events.ToolClicked, this);
			tool.addListener(editor.events.ToolMouseIn, this);
			tool.addListener(editor.events.ToolMouseOut, this);
			tool.addListener(editor.events.Enabled, this);
		}
	};
	
	ToolBar.prototype.layout = function() {		
		this.container = jQuery('<div class="toolbar"></div>');
		this.header = jQuery('<h3 class="toolTitle"></h3>');
		this.list = jQuery('<ul></ul>');
		
		this.container.append(this.header).append(this.list);
	};
	
	ToolBar.prototype.getActiveTool = function() {
		for (var i = 0, il = this.tools.length; i < il; i++) {
			var tool = this.tools[i].tool;
			if (tool.mode === editor.ToolConstants.MODE_DOWN) {
				return tool;
			}
		}
		
		return null;
	};
	
	ToolBar.prototype.loadState = function() {
		var tool = this.savedTool;
		
		if (tool == null) {
			tool = this.tools[0].tool;
		}
		
		tool.setMode(editor.ToolConstants.MODE_DOWN);
		this.header.text(tool.toolTitle);
		this.hidden = false;
	};
	
	ToolBar.prototype.notify = function(eventType, value) {
		switch (eventType) {
			case editor.events.ToolClicked:
				var toolList = this.tools;
				
				for (ndx = 0, len = toolList.length; ndx < len; ndx++) {
					var t = toolList[ndx].tool;
					
					if (t != value) {
						t.setMode(editor.ToolConstants.MODE_UP);
					}
				}
				
				this.header.text(value.toolTitle);
				break;
			case editor.events.ToolMouseIn:
				this.header.css('opacity', 0);
				this.mousedIn.push(value);
				break;
			case editor.events.ToolMouseOut:
				remove(value, this.mousedIn);
				if (this.mousedIn.length === 0) {
					this.header.css('opacity', 1);
				}
				break;
			case editor.events.Enabled:
				handleEnabled.call(this, value);
				break;
		}
	};
	
	ToolBar.prototype.remove = function(tool) {
		var tool = remove(tool, this.tools);
		tool.getUI().remove();
	};
	
	ToolBar.prototype.saveState = function() {
		this.savedTool = this.getActiveTool();
		
		if (this.savedTool) {
			this.savedTool.setMode(editor.ToolConstants.MODE_UP);
		}
		
		this.hidden = true;
	};
	
	ToolBar.prototype.setEnabled = function(enabled) {
		for (var i = 0, il = this.tools.length; i < il; i++) {
			this.tools[i].setEnabled(enabled);
		}
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  	 Toolbar Private Methods		  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
	function checkEnabled() {
		var enabled = false;
		
		for (var i = 0, il = this.tools.length; i < il && !enabled; i++) {
			enabled |= this.tools[i].enabled;	
		}
		
		return enabled;
	};
		
	function handleEnabled(data) {			
		var found = false;
		
		for (var i = 0, il = this.tools.length; i < il && !found; i++) {
			var t = this.tools[i];
			
			if (t.tool === data.item) {
				t.enabled = data.enabled; 
				found = true;
			}
		}	
			
		if (!data.enabled) {
			data.item.setMode(editor.ToolConstants.MODE_UP);			
			
			if (!checkEnabled.call(this)) {
				this.notifyListeners(editor.events.Enabled, {
					item: this,
					enabled: false
				});
			}
			else if (!this.hidden) {
				// select the next available tool
				var tool = nextAvailable.call(this);
				if (!this.hidden) {
					tool.setMode(editor.ToolConstants.MODE_DOWN);
				}
				this.header.text(tool.toolTitle);
			}
		}
		else {
			if (!this.hidden && this.getActiveTool() == null) {
				data.item.setMode(editor.ToolConstants.MODE_DOWN);
			}
			
			this.notifyListeners(editor.events.Enabled, {
				item: this,
				enabled: true
			});
		}
	};
	
	function nextAvailable() {
		var found = null;
		
		for (var i = 0, il = this.tools.length; i < il && found == null; i++) {
			var t = this.tools[i];
			
			if (t.enabled) {
				found = t.tool;
			}
		}
		
		return found;
	};
	
	function remove(item, list) {		
        var found = null;
        var ndx = list.indexOf(item);
        
        if (ndx != -1) {
            var spliced = list.splice(ndx, 1);
            
            if (spliced.length == 1) {
                found = spliced[0];
            }
        }
        
        return found;
	};
    
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  				  Model				  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * The ToolModel is the base tool model class.  All tool models should 
     * inherit this class to gain basic tool model functionality (such as being
     * an observable).
     */
	var ToolModel = editor.ToolModel = function(id) {
		editor.utils.Listenable.call(this);
		this.id = id;
		if (id) {
			models.put(id, this);
			editor.notifyListeners(editor.events.ModelAdded, {
				id: id,
				model: this
			});
			editor.addListener(editor.events.WorldCleaned, this);
			editor.addListener(editor.events.WorldLoaded, this);
		}
	};

	ToolModel.prototype = new editor.utils.Listenable();
	ToolModel.prototype.constructor = ToolModel;
		
	ToolModel.prototype.getId = function() {
		return this.id;
	};
	
	ToolModel.prototype.notify = function(eventType, value) {
		switch(eventType) {
			case editor.events.WorldCleaned:
				this.worldCleaned();
				break;
			case editor.events.WorldLoaded:
				this.worldLoaded();
				break;
		}
	};
	
	ToolModel.prototype.worldCleaned = function() {
		
	};
	
	ToolModel.prototype.worldLoaded = function() {
		
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  				  View				  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
    /*
     * Configuration object for the ToolView.
     */
    editor.ToolViewDefaults = {
		id: '',
        toolName: 'toolName',
		toolTip: ''
    };
	
	/**
	 * The ToolView is the base tool view class.  All tool views should 
	 * inherit from this in order to be added to the toolbar.
	 * 
	 * @param {Object} options configuration options.  The defaults are defined
	 *         in editor.ToolViewDefaults.
	 */
	var ToolView = editor.ToolView = function(options) {
		editor.utils.Listenable.call(this);
			
		this.config = jQuery.extend({}, editor.ToolViewDefaults, options);
		this.toolTitle = this.config.toolName;
		this.toolbarContainer = null;
		this.enabled = true;
		this.mode = editor.ToolConstants.MODE_UP;
		this.panels = [];
		this.visiblePanels = [];
		this.id = this.config.id;
		
		if (this.id) {
			this.layoutToolBarContainer();
			
			views.put(this.id, this);
			editor.notifyListeners(editor.events.ViewAdded, {
				id: this.id,
				view: this
			});
		}
	};

	ToolView.prototype = new editor.utils.Listenable();
	ToolView.prototype.constructor = ToolView;
	
	/**
	 * Enables/disables this tool based on the enabled flag.
	 * 
	 * @param {boolean} enabled flag indicating whether to enable or disable
	 *        this.
	 */
	ToolView.prototype.setEnabled = function(enabled) {
		if (this.enabled != enabled) {
			this.enabled = enabled;
			
			if (enabled) {
				this.toolbarContainer.show();
			}
			else {
				this.toolbarContainer.hide();
			}
			
			this.notifyListeners(editor.events.Enabled, {
				item: this,
				enabled: enabled
			});
		}
	};
	
	/**
	 * Sets the tool mode (either editor.ToolConstants.MODE_UP or
	 * editor.ToolConstants.MODE_DOWN).
	 * 
	 * @param {string} mode either editor.ToolConstants.MODE_UP or
	 *        editor.ToolConstants.MODE_DOWN
	 */
	ToolView.prototype.setMode = function(mode) {
		var oldMode = this.mode;
		this.mode = mode;
		
		if (this.toolbarContainer) {
			this.toolbarContainer.removeClass(oldMode);
			this.toolbarContainer.addClass(this.mode);
		}
		
		switch (mode) {
			case editor.ToolConstants.MODE_DOWN:
				for (var i = 0, il = this.visiblePanels.length; i < il; i++) {
					this.visiblePanels[i].setVisible(true);
				}
				
				this.visiblePanels = [];
				break;
			case editor.ToolConstants.MODE_UP:
				for (var i = 0, il = this.panels.length; i < il; i++) {
					var pnl = this.panels[i];
					
					if (pnl.isVisible()) {
						this.visiblePanels.push(pnl);
						pnl.setVisible(false);
					}
				}
				break;
		}
		
		this.notifyListeners(editor.events.ToolModeSet, {
			oldMode: oldMode,
			newMode: mode
		});
	};
	
	/**
	 * Returns the toolbar widget
	 * 
	 * @return {jQuery Object} the toolbar widget
	 */
	ToolView.prototype.getUI = function() {
		return this.toolbarContainer;
	};
	
	/**
	 * Performs the layout of the toolbar widget.
	 */
	ToolView.prototype.layoutToolBarContainer = function() {
		var view = this,
			classes = ['toolBtn', this.id, this.mode];
		
		this.toolbarContainer = jQuery('<div class="' + classes.join(' ') 
			+ '" title="' + this.config.toolTip + '"></div>');
		
		this.toolHover = jQuery('<h3 class="toolHover">' + this.config.toolName + '</h3>')
			.css('zIndex', editor.ui.Layer.TOOLBAR);
		this.toolbarContainer.append(this.toolHover);
		
		this.toolbarContainer.bind('click', function() {
			if (view.mode !== editor.ToolConstants.MODE_DOWN) {
            	view.notifyListeners(editor.events.ToolClicked, view);
                view.setMode(editor.ToolConstants.MODE_DOWN);
            }
		})
		.bind('mouseover', function(evt) {
			if (view.mode === editor.ToolConstants.MODE_UP) {
				view.toolHover.fadeIn(100);
				view.notifyListeners(editor.events.ToolMouseIn, view);
			}
		})
		.bind('mouseout', function(evt) {
			view.toolHover.promise('fx').done(function() {
				view.toolHover.fadeOut(100);
				view.notifyListeners(editor.events.ToolMouseOut, view);
			});
		});
	};
	
	ToolView.prototype.addPanel = function(panel) {
		if (jQuery.inArray(panel, this.panels) === -1) {
			this[panel.getName()] = panel;
			this.panels.push(panel);
			
			if (panel.config.startsVisible) {
				this.visiblePanels.push(panel);
			}
		}
	};
	
	ToolView.prototype.removePanel = function(panel) {
        var ndx = this.panels.indexOf(panel);
        
        if (ndx != -1) {
            this.panels.splice(ndx, 1);
			delete this[panel.getName()];
        }
	};
    
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  				Controller			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
	
    /**
     * The ToolController is the base tool controller class.  All tool 
     * controllers should inherit from this to get basic tool controller 
     * functionality.
     */
	var ToolController = editor.ToolController = function() {					
		this.model;
		this.view;
	};
	
	/**
	 * Sets the view to the given view.  If a model is already given, this
	 * calls bindEvents().
	 * 
	 * @param {editor.ToolView} view the new view
	 */
	ToolController.prototype.setView = function(view) {
		this.view = view;
		
		if (this.checkBindEvents()) {
			this.bindEvents();
		}
	};
	
	/**
	 * Sets the model to the given model.  If a view is already given, this
	 * calls bindEvents().
	 * 
	 * @param {editor.ToolModel} model the new model
	 */
	ToolController.prototype.setModel = function(model) {
		this.model = model;
		
		if (this.checkBindEvents()) {
			this.bindEvents();
		}
	};
	
	/**
     * Returns true if the model and view are all set.
     * 
     * @return true if model and view are set, false otherwise.
     */
	ToolController.prototype.checkBindEvents = function() {
		return this.model && this.view;
	};
	
	/**
	 * Binds handlers and listeners to the view and model to facilitate
	 * communication.
	 */
	ToolController.prototype.bindEvents = function() {
		
	};
	
////////////////////////////////////////////////////////////////////////////////////////////////////
//                     			  			 Helper Methods			  		                      //
////////////////////////////////////////////////////////////////////////////////////////////////////
		
	function createListItem(component) {
		var li = jQuery('<li></li>');				
		li.append(component.getUI()).data('component', component);			
		return li;
	};
	
})(editor);
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

(function(editor) {
	"use strict";

////////////////////////////////////////////////////////////////////////////////
//								Initialization  		                      //
////////////////////////////////////////////////////////////////////////////////
	
	var shorthand = editor.projects = {},
		prjMdl = null;
	
	shorthand.init = function() {
		var prjPane = new editor.ui.NavPane('Project:'),
			prjToolBar = new editor.ui.ToolBar(),
			
			prjView = new ProjectView(),
			prjCtr = new ProjectController();	

		prjMdl = new ProjectModel();	
		prjCtr.setModel(prjMdl);
		prjCtr.setView(prjView);
		
		prjToolBar.add(prjView);
		prjPane.setToolBar(prjToolBar);
		editor.ui.addNavPane(prjPane, 'prjPane');
		
		// disable default behavior
		var ui = prjPane.getUI();
		
		ui.find('a').unbind('click').bind('click', function() {
			var down = prjView.buttons.is(':visible');
			if (down) {
				prjView.cancel();
			}
			else {
				prjView.notifyListeners(shorthand.events.UpdateProjects);
				prjView.showButtons();
			}
		});
		prjPane.setVisible(true);
		
		prjView.sidePanel.addListener(editor.events.PanelVisible, function(data) {
			var pane = editor.ui.getNavBar().visiblePane;
			
			if (pane && !prjView.isPreview) {
				pane.setVisible(!data.visible);
			}
		});
		
		// Setup autosave
		var models = editor.getModels();
		
		for (var i = 0, il = models.length; i < il; ++i) {
			var model = models[i];
			
			if (model !== prjMdl) {
				model.addListener(editor.events.Created, prjMdl);
				model.addListener(editor.events.Removing, prjMdl);
				model.addListener(editor.events.Updated, prjMdl);
			}
		}
		
		editor.addListener(editor.events.PluginLoaded, function(name) {
			var model = editor.getModel(name);
			
			if (model) {
				model.addListener(editor.events.Created, prjMdl);
				model.addListener(editor.events.Removing, prjMdl);
				model.addListener(editor.events.Updated, prjMdl);
			}
		});
		
		var autoId = setInterval(function() {
			if (prjMdl.dirty && !prjMdl.loading) {
				prjMdl.save(AUTO_SAVE, true);
				prjMdl.dirty = false;
			}
		}, 5000);
		
		jQuery(document).unload(function() {
			clearInterval(autoId);
		});
	};
	
////////////////////////////////////////////////////////////////////////////////
//								Tool Definition  		                      //
////////////////////////////////////////////////////////////////////////////////
	
	// TODO: change to the autosave format like in google docs
	
	shorthand.events = {
		CheckProjectExists: 'checkProjectExists',
		Load: 'load',
		Loaded: 'loaded',
		NewProject: 'newProject',
		Projects: 'projects',
		ProjectExists: 'projectExsits',
		Publish: 'publish',
		Published: 'published',
		Save: 'save',
		Saved: 'saved',
		ServerRunning: 'serverRunning',
		StartPreview: 'startPreview',
		StopPreview: 'stopPreview',
		UpdateProjects: 'updateProjects'
	};
	
	var AUTO_SAVE = '_AutoSave_';
	
////////////////////////////////////////////////////////////////////////////////
//                                   Model                                    //
////////////////////////////////////////////////////////////////////////////////
	
	var ProjectModel = function() {
		editor.ToolModel.call('projectLoad');
		
		var mdl = this;
		
		this.projectCache = [];
		this.serverRunning = true;
		this.dirty = false;
		this.loading = false;
		this.current = null;
					
		jQuery.ajax({
			url: '/projects',
			dataType: 'json',
			success: function(data, status, xhr) {
				mdl.projectCache = data.projects;
			},
			error: function(xhr, status, err) {			
				mdl.serverRunning = false;
				mdl.notifyListeners(shorthand.events.ServerRunning, false);
			}
		});
	};
	var mdlSuper = editor.ToolModel.prototype;

	ProjectModel.prototype = new editor.ToolModel();
	ProjectModel.prototype.constructor = ProjectModel;
		
	ProjectModel.prototype.checkExisting = function(project) {			
		this.notifyListeners(shorthand.events.ProjectExists, {
			exists: findProject.call(this, project) !== -1,
			project: project
		});
	};
	
	ProjectModel.prototype.getProjects = function() {
		this.notifyListeners(shorthand.events.Projects, this.serverRunning ? 
			this.projectCache : null);
	};
	
	ProjectModel.prototype.load = function(project) {
		var data = {
				name: project
			},
			dispatchProxy = editor.getDispatchProxy(),
			mdl = this;
		
		jQuery.ajax({
			url: '/project',
			data: data,
			dataType: 'json',
			success: function(data, status, xhr) {
				mdl.loading = true;
				hemi.world.send(hemi.msg.cleanup);
				dispatchProxy.swap();
				hemi.octane.createWorld(data);
				dispatchProxy.unswap();
				hemi.world.ready();
				
				mdl.notifyListeners(shorthand.events.Loaded, {
					project: project,
					succeeded: true
				});
			},
			error: function(xhr, status, err){
				mdl.notifyListeners(shorthand.events.Loaded, {
					project: project,
					succeeded: false
				});
			}
		});
	};
	
	ProjectModel.prototype.newProject = function() {
		hemi.world.cleanup();
		hemi.world.camera.enableControl();
		hemi.world.ready();
	
		var vd = hemi.view.createViewData(hemi.world.camera);
		vd.eye = [0, 10, 40];
		vd.target = [0, 0, 0];
        hemi.world.camera.moveToView(vd, 0);
		
		this.notifyListeners(shorthand.events.NewProject);			
	};
	
	ProjectModel.prototype.notify = function(eventType, value) {
		mdlSuper.notify.call(eventType, value);
		
		switch (eventType) {
			case editor.events.Created:
			case editor.events.Removing:
			case editor.events.Updated: 
				this.dirty = true;
				break;
		}
	};
	
	ProjectModel.prototype.publish = function(project) {
		this.save(project, true);
		
		var data = {
				name: project
			},
			models = hemi.world.getModels(),
			mdl = this;
		
		if (models.length > 0) {
			var names = [];
			
			for (var i = 0, il = models.length; i < il; i++) {
				names.push(models[i].name);
			}
			
			data.models = names.join(', ');
		} else {
			data.models = 'No models needed!';
		}
		
		jQuery.ajax({
			url: '/publish',
			data: data,
			dataType: 'json',
			type: 'post',
			success: function(data, status, xhr) {
				var ndx = findProject.call(mdl, project);
				mdl.projectCache[ndx].published = true;
				mdl.notifyListeners(shorthand.events.Published, {
					name: project,
					published: true
				});
			},
			error: function(xhr, status, err) {
				mdl.notifyListeners(shorthand.events.Published, {
					name: project,
					published: false
				});
			}
		});
		
	};
	
	ProjectModel.prototype.remove = function(project) {								
		var data = {
				name: project
			},
			mdl = this;
		
		jQuery.ajax({
			url: '/project',
			data: data,
			dataType: 'json',
			type: 'delete',
			success: function(data, status, xhr) {
				mdl.notifyListeners(editor.events.Removing, data.name);
				
				var ndx = findProject.call(mdl, project);
				
				if (ndx !== -1) {
					mdl.projectCache.splice(ndx, 1);
				}
			},
			error: function(xhr, status, err) {
				mdl.serverRunning = false;
			}
		});
	};
	
	ProjectModel.prototype.save = function(project, replace) {
		replace = replace || false;
							
		var data = {
				name: project,
				octane: JSON.stringify(editor.getProjectOctane()),
				replace: replace
			},
			mdl = this;
		
		jQuery.ajax({
			url: '/project',
			data: data,
			dataType: 'json',
			type: 'post',
			success: function(data, status, xhr) {
				mdl.notifyListeners(shorthand.events.Saved, {
					project: project,
					saved: true
				});
				mdl.projectCache.push({
					name: project,
					published: false
				});
			},
			error: function(xhr, status, err) {
				mdl.serverRunning = false;
				mdl.notifyListeners(shorthand.events.Saved, {
					project: project,
					saved: false
				});
			}
		});
	};
	
	ProjectModel.prototype.startPreview = function() {
		if (this.worldState != null) {
			return;
		}
		
		// save current world props (and editor props)
		var hi = hemi.input,
			hr = hemi.core.client.root,
			hw = hemi.world,
			data = editor.getProjectOctane();
		
		// make a deep copy, so the preview world created from the data
		// won't affect the editor world
		data = hemi.utils.clone(data);
		
		this.worldState = {
			camera: hw.camera,
			citizens: hw.citizens,
			loader: hw.loader,
			pickGrabber: hw.pickGrabber,
			tranReg: hw.tranReg,
			fog: hw.fog,
			nextId: hw.checkNextId(),
			msgSpecs: hemi.dispatch.msgSpecs,
			pickRoot: hemi.picking.pickRoot,
			pickManager: hemi.picking.pickManager,
			modelRoot: hemi.model.modelRoot,
			shapeRoot: hemi.shape.root,
			children: hr.children,
			rL: hemi.view.renderListeners,
			mdL: hi.mouseDownListeners,
			muL: hi.mouseUpListeners,
			mmL: hi.mouseMoveListeners,
			mwL: hi.mouseWheelListeners,
	        kdL: hi.keyDownListeners,
	        kuL: hi.keyUpListeners,
	        kpL: hi.keyPressListeners
		};
		
		// Hide the currently rendered tree
		var children = hr.children;
		hr.children = [];
		
		for (var ndx = 0; ndx < children.length; ndx++) {
			children[ndx].parent = null;
		}
		
		// set the world to its initial state
		hemi.view.renderListeners = [hemi.view.clientSize];
		hi.mouseDownListeners = [hw];
		hi.mouseUpListeners = [];
		hi.mouseMoveListeners = [];
		hi.mouseWheelListeners = [];
        hi.keyDownListeners = [];
        hi.keyUpListeners = [];
        hi.keyPressListeners = [];
		hw.citizens = new hemi.utils.Hashtable();
		hw.camera = null;
		hw.loader = {finish: function(){}};
		hw.pickGrabber = null;
		hw.tranReg = new hemi.world.TransformRegistry();
		hw.fog = null;
		
		hemi.dispatch.msgSpecs = new hemi.utils.Hashtable();
		hemi.picking.init();
		hemi.model.init();
		hemi.shape.root = hemi.core.mainPack.createObject('Transform');
		hemi.shape.root.name = hemi.shape.SHAPE_ROOT;
		hemi.shape.root.parent = hemi.picking.pickRoot;
		
		hemi.world.subscribe(hemi.msg.progress, editor.ui.progressUI, 'msgUpdate');
		
		// now load the preview data
		hemi.octane.createWorld(data);
		hemi.world.ready();
	};
	
	ProjectModel.prototype.stopPreview = function() {
		if (this.worldState == null) {
			return;
		}
		
		var hi = hemi.input,
			hr = hemi.core.client.root,
			hw = hemi.world,
			ws = this.worldState;
		
		// Clean up the preview world
		hw.cleanup();
		hemi.dispatch.cleanup();
		hw.camera.cleanup();
		hemi.hud.hudMgr.clearDisplay();
		hemi.model.modelRoot.parent = null;
		hemi.core.mainPack.removeObject(hemi.model.modelRoot);
		hemi.shape.root.parent = null;
		hemi.core.mainPack.removeObject(hemi.shape.root);
		hemi.picking.pickRoot.parent = null;
		hemi.core.mainPack.removeObject(hemi.picking.pickRoot);
		
		// restore the world back to original state
		hemi.dispatch.msgSpecs = ws.msgSpecs;
		hemi.picking.pickRoot = ws.pickRoot;
		hemi.picking.pickManager = ws.pickManager;
		hemi.model.modelRoot = ws.modelRoot;
		hemi.shape.root = ws.shapeRoot;
		hemi.shape.material.getParam('lightWorldPos').bind(ws.camera.light.position);
		hemi.shape.transMaterial.getParam('lightWorldPos').bind(ws.camera.light.position);
		
		if (ws.fog != null) {
			hw.fog = ws.fog;
			hemi.view.setBGColor(ws.fog.color);
		}
		
		hw.tranReg = ws.tranReg;
		hw.pickGrabber = ws.pickGrabber;
		hw.loader = ws.loader;
		hw.camera = ws.camera;
		hw.citizens = ws.citizens;
		hw.setNextId(ws.nextId);
		hi.mouseDownListeners = ws.mdL;
		hi.mouseUpListeners = ws.muL;
		hi.mouseMoveListeners = ws.mmL;
		hi.mouseWheelListeners = ws.mwL;
        hi.keyDownListeners = ws.kdL;
        hi.keyUpListeners = ws.kuL;
        hi.keyPressListeners = ws.kpL;
		hemi.view.renderListeners = ws.rL;
		
		// Restore the render tree
		hr.children = ws.children;
		
		for (var ndx = 0; ndx < ws.children.length; ndx++) {
			ws.children[ndx].parent = hr;
		}
		
		hw.camera.update();
		hw.camera.updateProjection();
		this.worldState = null;
	};
	
	var findProject = function(project) {
		var ndx = -1,
			plc = project.toLowerCase();
		
		for (var i = 0, il = this.projectCache.length; i < il && ndx === -1; i++) {
			if (this.projectCache[i].name.toLowerCase() === plc) {
				ndx = i;
			}
		}
		
		return ndx;
	};
	
////////////////////////////////////////////////////////////////////////////////
//                              Loading Widget                                //
////////////////////////////////////////////////////////////////////////////////
	
	var ListItem = function() {
		editor.ui.EditableListItem.call(this, {
			editable: false
		});
		
		this.versionsHash = new Hashtable();
	};
	var liSuper = editor.ui.EditableListItem.prototype;

	ListItem.prototype = new editor.ui.EditableListItem();
	ListItem.prototype.constructor = ListItem;
		
	ListItem.prototype.add = function(project, version) {
		var li = new editor.ui.EditableListItem({
				editable: false,
				removeable: false
			});
		
		li.setText(version);
		li.attachObject(version);
		
		this.bindButtons(li);
		this.list.add(li);
		this.versionsHash.put(version, li);
	};
	
	ListItem.prototype.layout = function() {
		liSuper.layout.call(this);
		
		// attach the sub lists
		var loadHeader = jQuery('<h2>Versions:</h2>'),
			prjList = jQuery('<div class="prjListWrapper"></div>'),
			arrow = jQuery('<div class="prjListArrow"></div>'),
			wgt = this;
		
		this.list = new editor.ui.List({
			cssClass: 'prjLst',
			prefix: 'prjLst'
		});
		
		// publish link
		this.publishLink = jQuery('<a class="publish" href="" target="_blank">View Published</a>');
		
		prjList.append(loadHeader).append(this.list.getUI())
			.hide();
		arrow.hide();
		this.container.append(arrow).append(prjList);
		
		this.removeBtn.before(this.publishLink.hide());
		
		this.title.bind('click', function() {
			wgt.notifyListeners(shorthand.events.Load, wgt.getText());
		});
	};
	
	ListItem.prototype.remove = function(version) {
		var li = this.versionsHash.remove(version);			
		this.list.remove(li);
	};

	var LoadListWidget = function(options) {
	    editor.ui.ListWidget.call(this, {
			name: 'prjListWidget',
			listId: 'projectList',
			prefix: 'prjLst',
			title: 'Projects',
			instructions: "Click on a project to load it. Click the 'x' to delete.",
			height: editor.ui.Height.FULL
		});
			
		this.container.addClass('widgetWithForms');
	};

	LoadListWidget.prototype = new editor.ui.ListWidget();
	LoadListWidget.prototype.constructor = ProjectModel;
		    
    LoadListWidget.prototype.add = function(project) {			
		var li = this.items.get(project.name);
		
		if (!li) {
			li = this.createListItem();
			li.setText(project.name);
			
			this.bindButtons(li, project);
			this.list.add(li);
			this.items.put(project.name, li);
		}
		
		return li;
    };
	
	LoadListWidget.prototype.bindButtons = function(li, project) {
		var wgt = this;
		
		if (project.published) {
			li.publishLink.attr('href', '/projects/' + project.name 
				+ '.html').show();
		}
		li.removeBtn.bind('click', function(evt) {
			wgt.notifyListeners(editor.events.Remove, project.name);
		});
	};
	
	LoadListWidget.prototype.createListItem = function() {
		var li = new ListItem(),
			wgt = this;
		
		// relay messages
		li.addListener(shorthand.events.Load, function(project) {
			wgt.notifyListeners(shorthand.events.Load, project);
		});
		
		return li;
	};
    
    LoadListWidget.prototype.remove = function(projectName) {
		var li = this.items.get(projectName),
			retVal = false;
		
		if (li) {
			this.list.remove(li);
			this.items.remove(projectName);
			retVal = true;
		}
		
		return retVal;
    };
	
	LoadListWidget.prototype.update = function(project) {
		var li = this.items.get(project.name),
			retVal = false;
		
		if (li) {
			if (project.published) {
				li.publishLink.attr('href', '/projects/' + project.name 
					+ '.html').show();
			}
			retVal = true;
		}
		
		return retVal;
	};
	
////////////////////////////////////////////////////////////////////////////////
//                              Preview Widget                                //
////////////////////////////////////////////////////////////////////////////////
	
	var PreviewWidget = function() {
		editor.ui.Widget.call(this, {
			name: 'previewWidget',
			classes: ['previewWidget'],
			height: editor.ui.Height.MANUAL
		});
	};
	var prvSuper = editor.ui.Widget.prototype;

	PreviewWidget.prototype = new editor.ui.Widget();
	PreviewWidget.prototype.constructor = PreviewWidget;
		
	PreviewWidget.prototype.layout = function() {
		prvSuper.layout.call(this);
		var wgt = this,
			title = jQuery('<h1>World<span>Editor</span></h1>'),
			subTitle = jQuery('<h2>Preview Mode</h2>'),
			titleCtn = jQuery('<div></div>');
		
		this.stopBtn = jQuery('<button id="prjStopPreviewBtn">Stop Preview</button>');
		
		this.stopBtn.bind('click', function() {
			wgt.notifyListeners(shorthand.events.StopPreview);
		});
		
		titleCtn.append(title).append(subTitle);
		this.container.append(titleCtn).append(this.stopBtn);
	};
		
////////////////////////////////////////////////////////////////////////////////
//                                   View                                     //
////////////////////////////////////////////////////////////////////////////////   
	
	var ProjectView = function() {
		editor.ToolView.call(this, {
			toolName: 'Project:',
			toolTip: '',
			id: 'projectLoad'
		});
		
		// panels
		this.addPanel(new editor.ui.Panel({
			classes: ['prjSidePanel'],
			startsVisible: false
		}));
		this.addPanel(new editor.ui.Panel({
			location: editor.ui.Location.TOP,
			classes: ['prjTopPanel'],
			startsVisible: false
		}));
		
		this.sidePanel.addWidget(new LoadListWidget());
		this.topPanel.addWidget(new PreviewWidget());
	};

	ProjectView.prototype = new editor.ToolView();
	ProjectView.prototype.constructor = ProjectView;
		
	ProjectView.prototype.cancel = function() {
		this.hideButtons();
		this.sidePanel.setVisible(false);
		this.saveIpt.val('').show().blur();
		jQuery(document).unbind('click.prj');
	};
	
	ProjectView.prototype.checkSaveable = function() {
		var name = this.saveIpt.val(),
			saveable = name !== 'Unsaved Project' && name !== '';
		
		if (!saveable) {
			this.saveBtn.attr('disabled', 'disabled');
			this.publishBtn.attr('disabled', 'disabled');
		}
		else {
			this.saveBtn.removeAttr('disabled');
			this.publishBtn.removeAttr('disabled');
		}
		
		return saveable;
	};
	
	ProjectView.prototype.hideButtons = function() {
		this.buttons.slideUp(200);
	};
	
	ProjectView.prototype.layoutToolBarContainer = function() {			
		var ctn = this.toolbarContainer = jQuery('<div id="' 
			+ this.id + '"> \
				<p id="prjMsg"></p> \
				<input type="text" id="prjSaveIpt" value="Unsaved Project" /> \
				<div class="buttons"> \
					<button id="prjSaveBtn">Save</button> \
					<button id="prjCancelBtn">Cancel</button> \
					<button id="prjPreviewBtn">Preview</button> \
					<button id="prjPublishBtn">Publish</button> \
					<button id="prjNewBtn">New Project</button> \
				</div> \
			</div>');			
			
		var view = this,
			saveIpt = this.saveIpt = ctn.find('#prjSaveIpt'),
			saveBtn = this.saveBtn = ctn.find('#prjSaveBtn'),
			cancelBtn = this.cancelBtn = ctn.find('#prjCancelBtn').hide(),
			newBtn = this.newBtn = ctn.find('#prjNewBtn'),
			previewBtn = this.previewBtn = ctn.find('#prjPreviewBtn'),
			publishBtn = this.publishBtn = ctn.find('#prjPublishBtn');						
		
		this.buttons = ctn.find('div.buttons').hide();
		this.msg = ctn.find('#prjMsg').hide();
		
		cancelBtn.bind('click', function() {
			view.cancel();
		});
		
		newBtn.bind('click', function() {
			view.notifyListeners(shorthand.events.NewProject);
		});
		
		previewBtn.bind('click', function(evt) {
			view.isPreview = true;
			view.notifyListeners(shorthand.events.StartPreview);
			
			// hide the main panel
			editor.ui.getNavBar().setVisible(false);
			view.sidePanel.setVisible(false);
			
			// show the preview panel
			view.topPanel.setVisible(true);
		});
		
		publishBtn.bind('click', function() {
			view.notifyListeners(shorthand.events.Publish, saveIpt.val());
		});
		
		saveBtn.bind('click', function(evt) {
			if (saveBtn.hasClass('overwrite')) {
				view.notifyListeners(shorthand.events.Save, {
					project: saveIpt.val(),
					replace: true
				});
			}
			else {
				view.notifyListeners(shorthand.events.CheckProjectExists, saveIpt.val());
			}
		});
		
		saveIpt.bind('keyup', function(evt) {
			var code = evt.keyCode ? evt.keyCode : evt.which;
			
			if (code == 27) {
				view.cancel();
			}
			
			view.checkSaveable();
		})
		.bind('focus', function(evt) {				
			if (saveIpt.val() === 'Unsaved Project') {
				saveIpt.val('');
			}
			view.notifyListeners(shorthand.events.UpdateProjects);
			view.showButtons();
		})
		.bind('blur', function() {	
			if (saveIpt.is(':visible')) {
				var val = saveIpt.val();			
				
				if (val === '') {
					view.reset();
				}
			}
		});
		
		this.checkSaveable();
	};
	
	ProjectView.prototype.reset = function() {
		this.saveIpt.val(this.loadedProject == null ? 'Unsaved Project' :
			this.loadedProject);
		this.msg.empty().hide();
		this.cancelBtn.hide().removeClass('overwite');
		this.saveBtn.text('Save').removeClass('overwrite');
		this.saveIpt.removeClass('overwrite').show();
		this.checkSaveable();
	};
	
	ProjectView.prototype.showButtons = function() {
		this.buttons.slideDown(200);
	};
	
	ProjectView.prototype.stopPreview = function() {
		var view = this;
		
		// essentially queueing this
		setTimeout(function() {
			view.isPreview = false;
		}, 0);
		
		editor.ui.getNavBar().setVisible(true);
		this.sidePanel.setVisible(true);
		this.topPanel.setVisible(false);
	};
	
	ProjectView.prototype.updateExists = function(exists, project) {
		if (exists) {
			this.msg.empty().html('Already exists.').show();
			this.saveIpt.addClass('overwrite');
			this.cancelBtn.show().addClass('overwrite');
			this.saveBtn.text('Overwrite').addClass('overwrite');
		}
		else {
			this.msg.hide();
			this.notifyListeners(shorthand.events.Save, {
				project: project,
				replace: false
			});
		}
	};
	
	ProjectView.prototype.updateLoaded = function(project, succeeded) {
		if (succeeded) {
			if (project === AUTO_SAVE) {
				project = 'Restored Project';
			}
			
			this.loadedProject = project;
			this.reset();
			this.saveIpt.show().effect('highlight', {
				color: '#3b5e77'
			});
		}
		else {
			this.saveIpt.show();
			this.msg.text('Server Down. Could not load.').show();
		}

		this.sidePanel.setVisible(false);
		this.hideButtons();
	};
	
	ProjectView.prototype.updateNewProject = function() {
		this.loadedProject = null;
		this.reset();
		this.sidePanel.setVisible(false);
		this.hideButtons();
	};
	
	ProjectView.prototype.updateProjects = function(projects) {
		var lstWgt = this.sidePanel.prjListWidget,
			view = this;
		
		lstWgt.clear();
		
		if (projects === null) {
			this.msg.empty().text('Server Down').show();
			this.saveIpt.hide();
		}
		else {
			for (var i = 0, il = projects.length; i < il; i++) {
				lstWgt.add(projects[i]);
			}
		}
			
		jQuery(document).bind('click.prj', function(e) {
			var target = jQuery(e.target), 
				parent = target.parents('.prjSidePanel, #prjPane');
			
			if (parent.size() == 0 && target.attr('id') !== 'prjPane' 
					&& !view.isPreview) {
				view.cancel();
			}
		});
	};
	
	ProjectView.prototype.updatePublished = function(data) {
		var lstWgt = this.sidePanel.prjListWidget;
			
		lstWgt.update(data);
	};
	
	ProjectView.prototype.updateRemoved = function(project) {
		if (this.loadedProject === project) {
			this.loadedProject = null;
			this.reset();
		}
	};
	
	ProjectView.prototype.updateSaved = function(project, succeeded) {
		if (!succeeded) {
			this.msg.empty().text('Server Down. Could not save.').show();
		}
		else if (project !== AUTO_SAVE) {
			this.loadedProject = project;
			this.cancel();
			this.saveIpt.effect('highlight', {
				color: '#3b5e77'
			});
		}
	};
	
	ProjectView.prototype.updateServerRunning = function(isRunning) {
		if (!isRunning) {
			this.msg.empty().text('Server Down.').show();
		}
	};
	
////////////////////////////////////////////////////////////////////////////////
//                                Controller                                  //
////////////////////////////////////////////////////////////////////////////////
	
	var ProjectController = function() {
		editor.ToolController.call(this);
	};
	var ctrSuper = editor.ToolController.prototype;

	ProjectController.prototype = new editor.ToolController();
	ProjectController.prototype.constructor = ProjectController;
    
	/**
     * Binds event and message handlers to the view and model this object 
     * references.  
     */        
	ProjectController.prototype.bindEvents = function() {
		ctrSuper.bindEvents.call(this);
		
		var model = this.model,
			view = this.view,
			lstWgt = view.sidePanel.prjListWidget,
			prvWgt = view.topPanel.previewWidget;
		
		// view specific
		view.addListener(shorthand.events.CheckProjectExists, function(project) {
			model.checkExisting(project);
		});
		view.addListener(shorthand.events.NewProject, function() {
			model.newProject();
		});
		view.addListener(shorthand.events.Publish, function(project) {
			model.publish(project);
		});
		view.addListener(shorthand.events.Save, function(data) {
			model.save(data.project, data.replace);
		});
		view.addListener(shorthand.events.StartPreview, function() {
			model.startPreview();
		});
		view.addListener(shorthand.events.UpdateProjects, function() {
			model.getProjects();
		});
		
		// widget specific
		lstWgt.addListener(shorthand.events.Load, function(project) {
			model.load(project);
		});
		lstWgt.addListener(editor.events.Remove, function(project) {
			model.remove(project);
		});
		prvWgt.addListener(shorthand.events.StopPreview, function() {
			model.stopPreview();
			view.stopPreview();
		});
		
		// model specific		
		model.addListener(shorthand.events.Loaded, function(data) {
			view.updateLoaded(data.project, data.succeeded);
		});		
		model.addListener(shorthand.events.NewProject, function() {
			view.updateNewProject();
		});
		model.addListener(shorthand.events.ProjectExists, function(data) {
			view.updateExists(data.exists, data.project);
		});		
		model.addListener(shorthand.events.Projects, function(projects) {
			view.sidePanel.setVisible(true);
			view.updateProjects(projects);
		});
		model.addListener(shorthand.events.Published, function(data) {
			view.updatePublished(data);
		});
		model.addListener(editor.events.Removing, function(project) {
			view.updateRemoved(project);
			lstWgt.remove(project);
		});
		model.addListener(shorthand.events.Saved, function(data) {
			view.updateSaved(data.project, data.saved);
			lstWgt.add({
				name: data.project,
				published: false
			});
		});
		model.addListener(shorthand.events.ServerRunning, function(isRunning) {
			view.updateServerRunning(isRunning);
		});
	};
	
	shorthand.loadingDone = function() {
		prjMdl.dirty = false;
		prjMdl.loading = false;
	};
	
})(editor);/* 
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

(function(editor) {
	"use strict";
	
////////////////////////////////////////////////////////////////////////////////
//								Initialization  		                      //
////////////////////////////////////////////////////////////////////////////////
	
	var shorthand = editor.plugins = {};

	shorthand.init = function() {
		var plgPane = new editor.ui.NavPane('Manage Plugins'),
			plgToolBar = new editor.ui.ToolBar(),
		
			plgMdl = new PluginMgrModel(),
			plgView = new PluginMgrView(),
			plgCtr = new PluginMgrController();	
				
		plgCtr.setModel(plgMdl);
		plgCtr.setView(plgView);
		
		plgToolBar.add(plgView);
		plgPane.setToolBar(plgToolBar);
		editor.ui.addNavPane(plgPane, 'plgPane');
		
		// disable default behavior
		var ui = plgPane.getUI();
		
		ui.find('a').unbind('click');
		ui.find('h2').bind('click', function(evt) {
			plgPane.setVisible(!plgPane.isVisible());
			
			jQuery(document).bind('click.plg', function(e) {
				var target = jQuery(e.target), 
					parent = target.parents('#plgPane'), 
					isTool = target.parents('.toolBtn').size() > 0 ||
						target.hasClass('toolBtn'),
					isNavPane = target.parents('#navBar h2').size() > 0;
				
				if (parent.size() == 0 && target.attr('id') !== 'plgPane'
						&& !isTool && !isNavPane) {
					plgPane.setVisible(false);
					jQuery(document).unbind('click.plg');
				}
			});
		});
		
		// load plugins
		jQuery.get('js/editor/plugins/plugins.json', 'json')
			.success(function(data, status, xhr) {								
				// data is a json array
				var plugins = data.plugins;
				
				if (plugins == null) {
					plugins = JSON.parse(xhr.responseText).plugins;
				}
				
				if (plugins != null) {
					for (var i = 0, il = plugins.length; i < il; i++) {
						plgMdl.loadPlugin(plugins[i]);
					}
				}
			})
			.error(function(xhr, status, err) {
				// fail gracefully
			});
			
		// retrieve the list of plugins
		jQuery.get('/plugins')
			.success(function(data, status, xhr) {
				var plugins = data.plugins;
				
				for (var i = 0, il = plugins.length; i < il; i++) {
					plgMdl.addPlugin(plugins[i]);
				}
			})
			.error(function(xhr, status, err) {
				
			});
	};
	
////////////////////////////////////////////////////////////////////////////////
//								Tool Definition  		                      //
////////////////////////////////////////////////////////////////////////////////
	
	shorthand.events = {
		Checked: 'checked',
		PluginActive: 'pluginActive',
		PluginAdded: 'pluginAdded'
	};
	    
////////////////////////////////////////////////////////////////////////////////
//                                   Model                                    //
////////////////////////////////////////////////////////////////////////////////

	var PluginMgrModel = function() {
		editor.ToolModel.call(this, 'pluginManager');
		this.activePlugins = [];
		this.loadedPlugins = [];
		this.plugins = [];
		this.callbacks = [];
		this.scripts = new Hashtable();
		this.models = new Hashtable();
		this.views = new Hashtable();
		this.initComplete = false;
		
		editor.addListener(editor.events.ScriptLoadStart, this);
		editor.addListener(editor.events.ScriptLoaded, this);
		editor.addListener(editor.events.ModelAdded, this);
		editor.addListener(editor.events.ViewAdded, this);
	};
	
	PluginMgrModel.prototype = new editor.ToolModel();
	PluginMgrModel.prototype.constructor = PluginMgrModel;
		
	PluginMgrModel.prototype.loadingComplete = function() {
		var vals = this.scripts.values(),
			complete = true;
		
		for (var i = 0, il = vals.length; i < il && complete; i++) {
			complete &= vals[i];
		}
		
		if (complete) {
			for (var i = 0, il = this.callbacks.length; i < il; i++) {
				var obj = this.callbacks[i];
				obj.callback.apply(this, obj.params);
			}
			
			this.currentPlugin = null;
			this.initComplete = true;
			this.callbacks = [];
		}			
	};
	
	PluginMgrModel.prototype.addPlugin = function(pluginName) {
		if (this.plugins.indexOf(pluginName) === -1) {
			this.plugins.push(pluginName);
			this.notifyListeners(shorthand.events.PluginAdded, pluginName);
		}
	};
	
	PluginMgrModel.prototype.loadPlugin = function(pluginName) {
		var mdl = this;
		
		if (this.loadedPlugins.indexOf(pluginName) === -1) {
			// Initialize the plugin's namespace
			editor.tools[pluginName] = {};
			editor.getScript('js/editor/plugins/' + pluginName + '/' + pluginName + '.js');
			
			this.callbacks.push({
				callback: function(name){
					mdl.currentPlugin = name;
					editor.tools[name].init();
					editor.notifyListeners(editor.events.PluginLoaded, name);
					mdl.activePlugins.push(name);
					mdl.loadedPlugins.push(name);
					if (mdl.plugins.indexOf(name) === -1) {
						mdl.plugins.push(name);
						mdl.notifyListeners(editor.events.PluginLoaded, name);
					}
					
					mdl.updatePluginList();
					mdl.notifyListeners(shorthand.events.PluginActive, {
						plugin: name,
						active: true
					});
				},
				params: [pluginName]
			});
		}
		else if (this.activePlugins.indexOf(pluginName) === -1) {
			this.activePlugins.push(pluginName);
			// now notify that the plugin is active again
			var views = this.views.get(pluginName);
			
			for (var i = 0, il = views.length; i < il; i++) {
				views[i].setEnabled(true);
			}
			
			this.updatePluginList();
			this.notifyListeners(shorthand.events.PluginActive, {
				plugin: pluginName,
				active: true
			});
		}
	};
	
	PluginMgrModel.prototype.notify = function(eventType, value) {
		switch(eventType) {
			case editor.events.ScriptLoadStart:	
				this.scripts.put(value, false);
				break;
			case editor.events.ScriptLoaded:
				this.scripts.put(value, true);
				this.loadingComplete();
				break;
			case editor.events.ModelAdded:
				if (this.currentPlugin != null) {
					var models = this.models.get(this.currentPlugin);
					if (models == null) {
						models = [value.model];
					}
					this.models.put(this.currentPlugin, models);
				}
				break;
			case editor.events.ViewAdded:
				if (this.currentPlugin != null) {
					var views = this.views.get(this.currentPlugin);
					if (views == null) {
						views = [value.view];
					}
					this.views.put(this.currentPlugin, views);
				}
				break;
		}			
	};

	PluginMgrModel.prototype.removePlugin = function(pluginName) {
		this.activePlugins.splice(this.activePlugins.indexOf(pluginName), 1);
		
		// get views and disable them
		var views = this.views.get(pluginName);
		
		for (var i = 0, il = views.length; i < il; i++) {
			views[i].setEnabled(false);
		}
		
		this.notifyListeners(shorthand.events.PluginActive, {
			plugin: pluginName,
			active: false
		});
		
		this.updatePluginList();
	};
	
	PluginMgrModel.prototype.updatePluginList = function() {
		if (this.initComplete) {
			var mdl = this,
				plugsData = {
					plugins: mdl.activePlugins
				},
				data = {
					plugins: JSON.stringify(plugsData)
				};
			
			jQuery.post('/plugins', data, 'json')
			.success(function(data, status, xhr) {
				// No feedback expected
			})
			.error(function(xhr, status, err) {
				// No feedback expected
			});
		}
	};
		
////////////////////////////////////////////////////////////////////////////////
//                             Custom List Item                               //
////////////////////////////////////////////////////////////////////////////////

	var CheckableListItem = function() {
		editor.ui.ListItem.call(this);
	};
	var liSuper = editor.ui.ListItem.prototype;
	
	CheckableListItem.prototype = new editor.ui.ListItem();
	CheckableListItem.prototype.constructor = CheckableListItem;
						
	CheckableListItem.prototype.layout = function() {
		liSuper.layout.call(this);
		
		var wgt = this;
		
		this.title = jQuery('<label></label>');
		this.checkbox = jQuery('<input type="checkbox" />');
		this.container.append(this.checkbox).append(this.title);
		
		this.checkbox.bind('change', function() {
			wgt.notifyListeners(shorthand.events.Checked, {
				plugin: wgt.title.text(),
				checked: wgt.checkbox.prop('checked')
			});
		});
		this.container.bind('click', function(evt) {
			var isCheckbox = evt.target.tagName === 'INPUT',
				isLabel = evt.target.tagName === 'LABEL';
			
			if (!isCheckbox && !isLabel) {
				wgt.checkbox.click();
			}
		});			
	};
	
	CheckableListItem.prototype.setChecked = function(checked) {
		this.checkbox.prop('checked', checked);
	};
	
	CheckableListItem.prototype.setText = function(text) {
		var id = 'plg_li_' + text;
		
		this.title.text(text).attr('for', id);
		this.checkbox.attr('id', id);
	};
		
////////////////////////////////////////////////////////////////////////////////
//                                   View                                     //
////////////////////////////////////////////////////////////////////////////////   

	var PluginMgrView = function() {
		editor.ToolView.call(this, {
			id: 'pluginManager',
			toolName: 'Manage Plugins',
			toolTip: ''
		});
		
		this.listitems = new Hashtable();
	};
	
	PluginMgrView.prototype = new editor.ToolView();
	PluginMgrView.prototype.constructor = PluginMgrView;
		
	PluginMgrView.prototype.add = function(pluginName) {
		var li = new CheckableListItem(),
			view = this;
		li.setText(pluginName);
		
		li.addListener(shorthand.events.Checked, function(data) {
			view.notifyListeners(shorthand.events.Checked, data);
		});
		
		this.list.add(li);
		this.listitems.put(pluginName, li);
	};
	
	PluginMgrView.prototype.layoutToolBarContainer = function() {			
		var ctn = this.toolbarContainer = jQuery('<div id="' 
			+ this.id + '"> </div>');
			
		this.list = new editor.ui.List();			
		ctn.append(this.list.getUI());
	};
	
	PluginMgrView.prototype.setActive = function(pluginName, active) {
		this.listitems.get(pluginName).setChecked(active);
	};
	
////////////////////////////////////////////////////////////////////////////////
//                                Controller                                  //
////////////////////////////////////////////////////////////////////////////////
	
	var PluginMgrController = function() {
		editor.ToolController.call(this);
	};
	var ctrSuper = editor.ToolController.prototype;
	
	PluginMgrController.prototype = new editor.ToolController();
	PluginMgrController.prototype.constructor = PluginMgrController;
    
	/**
     * Binds event and message handlers to the view and model this object 
     * references.  
     */        
	PluginMgrController.prototype.bindEvents = function() {
		ctrSuper.bindEvents.call(this);
		
		var model = this.model,
			view = this.view;
		
		// view specific
		view.addListener(shorthand.events.Checked, function(data) {
			if (data.checked) {
				model.loadPlugin(data.plugin);
			}
			else {
				model.removePlugin(data.plugin);
			}
		});
		
		// model specific
		model.addListener(editor.events.PluginLoaded, function(pluginName) {
			view.add(pluginName);
		});
		model.addListener(shorthand.events.PluginActive, function(data) {
			view.setActive(data.plugin, data.active);
		});
		model.addListener(shorthand.events.PluginAdded, function(pluginName) {
			view.add(pluginName);
		});
	};
	
})(editor);