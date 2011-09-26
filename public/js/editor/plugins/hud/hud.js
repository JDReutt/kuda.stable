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

(function() {
	
////////////////////////////////////////////////////////////////////////////////
//								Initialization								  //
////////////////////////////////////////////////////////////////////////////////
	
	editor.tools.hud = editor.tools.hud || {};
	
	editor.tools.hud.init = function() {
		var tabpane = editor.ui.getTabPane('HUD'),
		
		hudMdl = new HudModel(),
		hudView = new HudView(),
		hudCtr = new HudController();
		
		hudCtr.setModel(hudMdl);
		hudCtr.setView(hudView);
		
		tabpane.toolbar.add(hudView);
	};

////////////////////////////////////////////////////////////////////////////////
//								Tool Definition								  //
////////////////////////////////////////////////////////////////////////////////
	
    editor.EventTypes = editor.EventTypes || {};
		
	// model specific
	editor.EventTypes.DisplaySet = "Hud.DisplaySet";
	editor.EventTypes.ElementCreated = "Hud.ElementCreated";
	editor.EventTypes.ElementRemoved = "Hud.ElementRemoved";
	editor.EventTypes.ElementSet = "Hud.ElementSet";
	editor.EventTypes.ElementUpdated = "Hud.ElementUpdated";
	editor.EventTypes.PageCreated = "Hud.PageCreated";
	editor.EventTypes.PageRemoved = "Hud.PageRemoved";
	editor.EventTypes.PageSet = "Hud.PageSet";
	editor.EventTypes.HudWorldLoaded = "Hud.HudWorldLoaded";
	
	// hud edit specific
	editor.EventTypes.CreateDisplay = "Hud.CreateDisplay";
	editor.EventTypes.CreatePage = "Hud.CreatePage";
	editor.EventTypes.RemoveDisplay = "Hud.RemoveDisplay";
	editor.EventTypes.RemoveElement = "Hud.RemoveElement";
	editor.EventTypes.RemovePage = "Hud.RemovePage";
	editor.EventTypes.SaveElement = "Hud.SaveElement";
	editor.EventTypes.SavePage = "Hud.SavePage";
	
	// hud tree specific
	editor.EventTypes.SelectHudNode = "Hud.SelectHudNode";
	
	// shared
	editor.EventTypes.SetElement = "Hud.SetElement";
	
    
////////////////////////////////////////////////////////////////////////////////
//                                   Model                                    //
////////////////////////////////////////////////////////////////////////////////
    
    /**
     * A HudModel handles the creation, updating, and removal of heads-up 
     * displays.
     */
    var HudModel = editor.ToolModel.extend({
		init: function() {
			this._super('hud');
			
			this.currentDisplay = null;
			this.currentPage = null;
			this.currentElement = null;
			this.theme = null;
	    },
		
		createDisplay: function(name) {
			var display = new hemi.hud.HudDisplay();
			display.name = name;
			this.notifyListeners(editor.events.Created, display);
			this.setDisplay(display);
		},
		
		createPage: function(opt_select) {
			var page = new hemi.hud.HudPage();
			this.currentDisplay.addPage(page);
			page.name = this.currentDisplay.name + ' Page ' +
				this.currentDisplay.getNumberOfPages();
			this.notifyListeners(editor.EventTypes.PageCreated, page);
			
			if (opt_select) {
				this.setPage(page);
			}
		},
		
		removeDisplay: function(display) {
			if (display === this.currentDisplay) {
				this.setDisplay(null);
			}
			
			display.cleanup();		
			this.notifyListeners(editor.events.Removed, display);
		},
		
		removeElement: function(element) {
			this.currentPage.removeElement(element);
			element.cleanup();
			this.currentDisplay.showPage();
			this.notifyListeners(editor.EventTypes.ElementRemoved, element);
		},
		
		removePage: function(page) {
			this.currentDisplay.removePage(page);
			page.cleanup();
			this.notifyListeners(editor.EventTypes.PageRemoved, page);
		},
		
		saveElement: function(props) {
			var element = this.currentElement,
				event = editor.EventTypes.ElementCreated,
				refresh = true;
			
			if (props.type === 'Text') {
				if (element !== null) {
					if (element instanceof hemi.hud.HudText) {
						event = editor.EventTypes.ElementUpdated;
					} else {
						this.currentPage.removeElement(element);
						element.cleanup();
						element = null;
					}
				}
				
				if (element === null) {
					element = new hemi.hud.HudText();
					this.currentPage.addElement(element);
				}
				
				element.x = props.x;
				element.y = props.y;
				element.setText(props.text);
				element.setWidth(props.width);
			} else if (props.type === 'Image') {
				if (element !== null) {
					if (element instanceof hemi.hud.HudImage) {
						event = editor.EventTypes.ElementUpdated;
					} else {
						this.currentPage.removeElement(element);
						element.cleanup();
						element = null;
					}
				}
				
				if (element === null) {
					element = new hemi.hud.HudImage();
					this.currentPage.addElement(element);
				}
				
				element.x = props.x;
				element.y = props.y;
				element.setImageUrl(props.url);
				refresh = false;
				var that = this,
					msgHandler = element.subscribe(hemi.msg.load, function(msg) {
						element.unsubscribe(msgHandler, hemi.msg.load);
						that.currentDisplay.showPage();
					});
			}
			
			if (element !== null) {
				element.name = props.name;
				
				if (props.config) {
					element.setConfig(props.config);
				}
				this.notifyListeners(event, element);
			}
			
			this.setElement(null);
			
			if (refresh) {
				this.currentDisplay.show();
			}
		},
		
		savePage: function(props) {
			this.currentPage.setConfig(props);
			
			if (this.currentDisplay.isVisible()) {
				this.currentDisplay.showPage();
			}
		},
		
		setDisplay: function(display) {
			if (this.currentDisplay !== null) {
				this.currentDisplay.hide();
			}
			
			if (display === null) {
				this.currentPage = null;
				this.currentElement = null;
			} else if (display.getNumberOfPages() > 0) {
				display.show();
			}
			
			this.currentDisplay = display;
			this.notifyListeners(editor.EventTypes.DisplaySet, display);
		},
		
		setElement: function(element, opt_type) {			
			var type = opt_type ? opt_type : null;
			
			this.currentElement = element;
			this.notifyListeners(editor.EventTypes.ElementSet, {
				element: element,
				type: type
			});
		},
		
		setPage: function(page) {
			var hide = true;
			
			if (page !== null) {
				for (var ndx = 0, len = this.currentDisplay.pages.length; hide && ndx < len; ndx++) {
					if (this.currentDisplay.pages[ndx] === page) {
						this.currentDisplay.currentPage = ndx;
						this.currentDisplay.showPage();
						hide = false;
					}
				}
			}
			
			if (hide) {
				this.currentDisplay.hide();
			}
			
			this.currentPage = page;
			this.notifyListeners(editor.EventTypes.PageSet, page);
		},
			
		worldCleaned: function() {
			var displays = hemi.world.getHudDisplays();
			
			for (var ndx = 0, len = displays.length; ndx < len; ndx++) {
				this.notifyListeners(editor.events.Removed, displays[ndx]);
			}
	    },
	    
	    worldLoaded: function() {
			var displays = hemi.world.getHudDisplays();
			
			this.notifyListeners(editor.EventTypes.HudWorldLoaded, displays);
	    }
	});
	
////////////////////////////////////////////////////////////////////////////////
//                     	 	   Hud Tree Sidebar Widget                        //
////////////////////////////////////////////////////////////////////////////////     
	
    var TREE_PREFIX = 'hud';
    
	var TreeWidget = editor.ui.Widget.extend({
		init: function(options) {
		    this._super({
				name: 'hudTreeWidget'
			});	
		},
		
		finishLayout: function() {
			this._super();
			
			this.tree = jQuery('<div id="hudTree"></div>');
			this.title = jQuery('<h1>Hud Outline</h1>');
			this.instructions = jQuery("<p>Type in a name and click 'Create New Display' to add a new HUD display box</p>");
			this.form = jQuery('<form method="post"></form>');
			this.nameInput = jQuery('<input type="text" id="hudDpyName" />');
			this.createBtn = jQuery('<button id="createHudDisplay" class="inlineBtn">Create New Display</button>');
			var wgt = this;
			
			this.createBtn.bind('click', function(evt) {
				var name = wgt.nameInput.val();
				wgt.notifyListeners(editor.EventTypes.CreateDisplay, name);
				wgt.createBtn.attr('disabled', 'disabled');
				wgt.nameInput.val('');
			})
			.attr('disabled', 'disabled');
			
			this.nameInput.bind('keyup', function(evt) {
				var val = jQuery(this).val();
				
				if (val !== '') {
					wgt.createBtn.removeAttr('disabled');
				} else {
					wgt.createBtn.attr('disabled', 'disabled');
				}
			});
			
			this.form.append(this.nameInput).append(this.createBtn)
				.bind('submit', function(evt) {
					return false;
				});
			this.container.append(this.title).append(this.instructions)
				.append(this.form).append(this.tree);
			
			this.tree.bind('select_node.jstree', function(evt, data) {
				var elem = data.rslt.obj,
					path = wgt.tree.jstree('get_path', elem, true),
					hudObjs = [];
					
				for (var ndx = 0, len = path.length; ndx < len; ndx++) {
					hudObjs.push(jQuery('#' + path[ndx]).data('jstree'));
				}
				wgt.notifyListeners(editor.EventTypes.SelectHudNode, hudObjs);
			}).jstree({
				'json_data': {
					'data': {}
				},
				'types': {
					'types': {
						'display': {
							'icon': {
								'image': 'images/treeSprite.png',
								'position': '-96px 0'
							}
						},
						'page': {
							'icon': {
								'image': 'images/treeSprite.png',
								'position': '-112px 0'
							}
						},
						'text': {
							'icon': {
								'image': 'images/treeSprite.png',
								'position': '-64px 0'
							}
						},
						'image': {
							'icon': {
								'image': 'images/treeSprite.png',
								'position': '-128px 0'
							}
						}
					}
				},
				'themes': {
					'dots': false
				},
				'ui': {
					'select_limit': 1,
					'selected_parent_close': 'false'
				},
				'plugins': ['json_data', 'sort', 'themes', 'types', 'ui']
			});
		},
		
		getNode: function(obj) {
			return jQuery('#' + this.getNodeName(obj));
		},
		
		getNodeName: function(obj) {
			var nodeName = null;
			
			if (obj != null) {
				nodeName = TREE_PREFIX + obj.getCitizenType().split('.').pop();				
				nodeName += '_' + obj.getId();				
				nodeName = nodeName.replace(' ', '_').replace('.', '_');
			}
			
			return nodeName;
		},
		
		createJson: function(obj) {
			var json = null;
			
			if (obj.data && obj.attr) {
				json = obj;
			}
			else {
				var id = this.getNodeName(obj),
					name = obj.name,
					type = obj.getCitizenType().split('.').pop().toLowerCase()
						.replace('hud', '');
					
				json = {
					data: name,
					attr: {
						id: id,
						rel: type
					},
					state: 'closed',
					children: [],
					metadata: obj
				};
			}
			
			return json;
		},
			    
	    add: function(obj, parentObj) {
			var parentNode = parentObj == null ? -1 : this.getNode(parentObj),
				objJson = this.createJson(obj);
			
			this.tree.jstree('create_node', parentNode, 'inside', {
				json_data: objJson
			});
			
			this.tree.jstree('open_node', parentNode);
	    },
	    
	    remove: function(obj) {
			var node = this.getNode(obj);
			
			this.tree.jstree('delete_node', node);
	    },
		
		update: function(obj) {
			var node = this.getNode(obj);
			
			this.tree.jstree('rename_node', node, obj.name);
		},
		
		select: function(obj) {
			this.tree.jstree('deselect_all');
			this.tree.jstree('select_node', this.getNode(obj));
		},
		
		resize: function(maxHeight) {
			this._super(maxHeight);	
		}
	});	
	
////////////////////////////////////////////////////////////////////////////////
//                     	 	 Create Hud Sidebar Widget                        //
////////////////////////////////////////////////////////////////////////////////     
	
	var CreateWidget = editor.ui.FormWidget.extend({
		init: function(options) {
			this._super({
				name: 'createHudWidget',
				uiFile: 'js/editor/plugins/hud/html/displaysForms.htm'
			});	
		},
		
		finishLayout: function() {
			this._super();
			
			var wgt = this,
				validator = editor.ui.createDefaultValidator();
			
			this.displayEditor = this.find('#hudDpyEditor');
			this.pageEditor = this.find('#hudPgeEditor');
			this.textEditor = this.find('#hudTxtEditor');
			this.textPosition = new editor.ui.Vector({
				container: wgt.find('#hudTxtPositionDiv'),
				inputs: ['x', 'y'],
				validator: validator
			});
			this.imageEditor = this.find('#hudImgEditor');
			this.imagePosition = new editor.ui.Vector({
				container: wgt.find('#hudImgPositionDiv'),
				inputs: ['x', 'y'],
				validator: validator
			});
			
			this.bindDisplayEditor();
			this.bindPageEditor();
			this.bindTextEditor(validator);
			this.bindImageEditor();
			
			this.find('form').bind('submit', function(evt) {
				return false;
			});
			
			// hide all
			this.displayEditor.hide();
			this.pageEditor.hide();
			this.textEditor.hide();
			this.imageEditor.hide();
		},
		
		edit: function(obj, citizenType) {
			if (obj) {
				citizenType = obj.getCitizenType().split('.').pop();
			}
			
			// now setup the appropriate editor
			switch (citizenType) {
				case 'HudDisplay':
					this.setDisplayEditor(obj);
					// set the preferred height
					this.preferredHeight = this.displayEditor.height();
					break;
				case 'HudPage':
					this.setPageEditor(obj);
					// set the preferred height
					this.preferredHeight = this.pageEditor.height();
					break;
				case 'HudText':
					this.setTextEditor(obj);
					// set the preferred height
					this.preferredHeight = this.textEditor.height();
					break;
				case 'HudImage':
					this.setImageEditor(obj);
					// set the preferred height
					this.preferredHeight = this.imageEditor.height();
					break;
			}
		},
		
		canSave: function(inputs, btns) {
			var	canSave = true;
			
			for (var ndx = 0, len = inputs.length; canSave && ndx < len; ndx++) {
				canSave = inputs[ndx].value !== '';
			}
			
			if (canSave) {
				for (var ndx = 0, len = btns.length; ndx < len; ndx++) {
					btns[ndx].removeAttr('disabled');
				}
			}
			else {
				for (var ndx = 0, len = btns.length; ndx < len; ndx++) {
					btns[ndx].attr('disabled', 'disabled');
				}
			}
		},
		
		bindDisplayEditor: function() {
			var addPageBtn = this.displayEditor.find('#hudDpyAddPageBtn'),
				removeBtn = this.displayEditor.find('#hudDpyRemoveBtn'),
				wgt = this;
			
			addPageBtn.bind('click', function(evt) {
				wgt.notifyListeners(editor.EventTypes.CreatePage, true);
			});
			
			removeBtn.bind('click', function(evt) {
				var display = wgt.displayEditor.data('obj');
				
				wgt.notifyListeners(editor.EventTypes.RemoveDisplay, display);
			});
		},
		
		bindPageEditor: function() {
			var pgeEdt = this.pageEditor,
				addTextBtn = pgeEdt.find('#hudPgeAddTextBtn'),
				addImageBtn = pgeEdt.find('#hudPgeAddImageBtn'),
				removeBtn = pgeEdt.find('#hudPgeRemoveBtn'),
				saveBtn = pgeEdt.find('#hudPgeSaveBtn'),
				cancelBtn = pgeEdt.find('#hudPgeCancelBtn'),
				wgt = this;
			
			var colorPicker = new editor.ui.ColorPicker({
				inputId: 'hudPgeColor',
				buttonId: 'hudPgeColorPicker'
			});
			
			this.find('#hudPgeColorLbl').after(colorPicker.getUI());
			
			colorPicker.addListener(editor.events.ColorPicked, function(clr) {		
				saveBtn.removeAttr('disabled');
				cancelBtn.removeAttr('disabled');
			});
			
			pgeEdt.data('colorPicker', colorPicker);
			
			addTextBtn.bind('click', function(evt) {
				pgeEdt.hide();
				wgt.notifyListeners(editor.EventTypes.SetElement, {
					element: null,
					type: 'HudText'
				});
			});
			
			addImageBtn.bind('click', function(evt) {
				pgeEdt.hide();
				wgt.notifyListeners(editor.EventTypes.SetElement, {
					element: null,
					type: 'HudImage'
				});
			});
			
			removeBtn.bind('click', function(evt) {
				var page = pgeEdt.data('obj');
				
				wgt.notifyListeners(editor.EventTypes.RemovePage, page);
			});
			
			saveBtn.bind('click', function(evt) {				
				var props = {
					color: colorPicker.getColor()
				};
				
				wgt.notifyListeners(editor.EventTypes.SavePage, props);
				saveBtn.attr('disabled', 'disabled');
				cancelBtn.attr('disabled', 'disabled');
			});
			
			cancelBtn.bind('click', function(evt) {
				var color = pgeEdt.data('oldColor');
				
				colorPicker.setColor(color);
				cancelBtn.attr('disabled', 'disabled');
				saveBtn.attr('disabled', 'disabled');
			})
			.attr('disabled', 'disabled');
		},
		
		bindTextEditor: function(validator) {
			var txtEdt = this.textEditor,
				inputs = txtEdt.find('input'),
				required = txtEdt.find('input:not(.optional)'),
				textInput = txtEdt.find('#hudTxtText'),
				fontSelect = txtEdt.find('#hudTxtFont'),
				styleSelect = txtEdt.find('#hudTxtStyle'),
				alignSelect = txtEdt.find('#hudTxtAlign'),
				saveBtn = txtEdt.find('#hudTxtSaveBtn'),
				cancelBtn = txtEdt.find('#hudTxtCancelBtn'),
				removeBtn = txtEdt.find('#hudTxtRemoveBtn'),
				colorPicker = new editor.ui.ColorPicker({
					inputId: 'hudTxtColor',
					buttonId: 'hudTxtColorPicker'
				}),
				wgt = this;

			this.txtNameInput = new editor.ui.Input({
				container: txtEdt.find('#hudTxtName'),
				type: 'string'
			});
			this.sizeInput = new editor.ui.Input({
				container: txtEdt.find('#hudTxtSize'),
				type: 'integer',
				validator: validator
			});
			this.widthInput = new editor.ui.Input({
				container: txtEdt.find('#hudTxtWidth'),
				validator: validator
			});
			this.find('#hudTxtColorLbl').after(colorPicker.getUI());
			
			txtEdt.data('colorPicker', colorPicker);
													
			inputs.bind('blur', function(evt) {
				wgt.canSave(required, [saveBtn]);
			})
			.bind('change', function(evt) {
				wgt.canSave(required, [saveBtn]);
			}); 
			
			this.txtNameInput.getUI().bind('keyup', function(evt) {
				wgt.canSave(required, [saveBtn]);
			});
			
			saveBtn.bind('click', function(evt) {
				var size = wgt.sizeInput.getValue(),
					font = fontSelect.val(),
					style = styleSelect.val(),
					align = alignSelect.val(),
					color = colorPicker.getColor(),
					pos = wgt.textPosition.getValue();
				
				var props = {
					type: 'Text',
					name: wgt.txtNameInput.getValue(),
					x: pos[0],
					y: pos[1],
					text: textInput.val(),
					width: wgt.widthInput.getValue(),
					config: {}
				};
				
				if (color != null) {
					props.config.color = color;
				}
				if (size != null) {
					props.config.textSize = size;
				}
				if (font !== '-1') {
					props.config.textTypeface = font;
				}
				if (style !== '-1') {
					props.config.textStyle = style;
				}
				if (align !== '-1') {
					props.config.textAlign = align;
				}
				
				colorPicker.setColor([1, 1, 1, 1]);
				wgt.setTextEditor(null);
				wgt.notifyListeners(editor.EventTypes.SaveElement, props);
			});
			
			cancelBtn.bind('click', function(evt) {
				txtEdt.hide();
				wgt.pageEditor.show();
				wgt.preferredHeight = wgt.pageEditor.height();
				txtEdt.find('input.error').removeClass('error');
			});
			
			removeBtn.bind('click', function(evt) {
				var text = txtEdt.data('obj');
				
				wgt.notifyListeners(editor.EventTypes.RemoveElement, text);
			})
			.hide();
		},
		
		bindImageEditor: function() {
			var imgEdt = this.imageEditor,
				inputs = imgEdt.find('input'),
				saveBtn = imgEdt.find('#hudImgSaveBtn'),
				cancelBtn = imgEdt.find('#hudImgCancelBtn'),
				removeBtn = imgEdt.find('#hudImgRemoveBtn'),
				wgt = this;

			this.imgNameInput = new editor.ui.Input({
				container: imgEdt.find('#hudImgName'),
				type: 'string'
			});
			this.urlInput = new editor.ui.Input({
				container: imgEdt.find('#hudImgUrl'),
				type: 'string'
			});
						
			inputs.bind('blur', function(evt) {
				wgt.canSave(inputs, [saveBtn]);
			})
			.bind('change', function(evt) {
				wgt.canSave(inputs, [saveBtn]);
			});
			
			this.imgNameInput.getUI().bind('keyup', function(evt) {
				wgt.canSave(inputs, [saveBtn]);
			});
			
			saveBtn.bind('click', function(evt) {
				var pos = wgt.imagePosition.getValue(),
					props = {
						type: 'Image',
						name: wgt.imgNameInput.getValue(),
						x: pos[0],
						y: pos[1],
						url: wgt.urlInput.getValue()
					};
				
				wgt.setImageEditor(null);
				wgt.notifyListeners(editor.EventTypes.SaveElement, props);
			});
			
			cancelBtn.bind('click', function(evt) {
				imgEdt.hide();
				wgt.pageEditor.show();
				wgt.preferredHeight = wgt.pageEditor.height();
				imgEdt.find('input.error').removeClass('error');
			});
			
			removeBtn.bind('click', function(evt) {
				var image = imgEdt.data('obj');
				
				wgt.notifyListeners(editor.EventTypes.RemoveElement, image);
			}).hide();
		},
		
		setDisplayEditor: function(obj) {
			this.displayEditor.data('obj', obj).find('.displayName').text(obj.name);
			
			this.displayEditor.show();
			this.pageEditor.hide();
			this.textEditor.hide();
			this.imageEditor.hide();
		},
		
		setPageEditor: function(obj) {
			var pgeEdt = this.pageEditor,
				colorPicker = pgeEdt.data('colorPicker'),
				color = obj && obj.config.color ? obj.config.color 
					: hemi.hud.theme.page.color;
				
			pgeEdt.data('obj', obj).data('oldColor', color)
				.find('.displayName').text(obj.name);
			
			colorPicker.setColor(color);		
			
			pgeEdt.show();
			this.displayEditor.hide();
			this.textEditor.hide();
			this.imageEditor.hide();
		},
		
		setTextEditor: function(obj) {
			var txtEdt = this.textEditor,
				required = txtEdt.find('input:not(.optional)'),
				textInput = txtEdt.find('#hudTxtText'),
				fontSelect = txtEdt.find('#hudTxtFont'),
				styleSelect = txtEdt.find('#hudTxtStyle'),
				alignSelect = txtEdt.find('#hudTxtAlign'),
				removeBtn = txtEdt.find('#hudTxtRemoveBtn'),
				colorPicker = txtEdt.data('colorPicker'),
				color = obj && obj.config.color ? obj.config.color 
					: hemi.hud.theme.text.color;
				
			txtEdt.data('obj', obj).find('.displayName').text(obj ? obj.name : '');
			obj ? this.textPosition.setValue([obj.x, obj.y]) : this.textPosition.reset();
			this.widthInput.setValue(obj ? obj.width : null);
			textInput.val(obj ? obj.text[0] : '');
			this.txtNameInput.setValue(obj ? obj.name : null);
			this.sizeInput.setValue(obj && obj.config.textSize ? obj.config.textSize 
				: hemi.hud.theme.text.textSize);
			fontSelect.val(obj && obj.config.textTypeface
				? obj.config.textTypeface : hemi.hud.theme.text.textTypeface);
			styleSelect.val(obj && obj.config.textStyle
				? obj.config.textStyle: hemi.hud.theme.text.textStyle);
			alignSelect.val(obj && obj.config.textAlign
				? obj.config.textAlign: hemi.hud.theme.text.textAlign);
			
			colorPicker.setColor(color);
			
			if (obj) {
				removeBtn.show();		
			}
			else {
				removeBtn.hide();		
			}
			
			this.canSave(required, [txtEdt.find('#hudTxtSaveBtn')]);
			txtEdt.show();
			
			this.pageEditor.hide();
			this.displayEditor.hide();
			this.imageEditor.hide();
		},
		
		setImageEditor: function(obj) {
			var imgEdt = this.imageEditor,
				removeBtn = imgEdt.find('#hudImgRemoveBtn');
				
			imgEdt.data('obj', obj).find('.displayName').text(obj ? obj.name : '');
			obj ? this.imagePosition.setValue([obj.x, obj.y]) : this.imagePosition.reset();
			this.urlInput.setValue(obj ? obj.getImageUrl() : null);
			this.imgNameInput.setValue(obj ? obj.name : null);
			
			if (obj) {
				removeBtn.show();
			}
			else {
				removeBtn.hide();
			}
			
			imgEdt.show();
			
			this.imageEditor.show();
			this.pageEditor.hide();
			this.textEditor.hide();
			this.displayEditor.hide();
		},
		
		resize: function(maxHeight) {
			this._super(maxHeight);	
			
			var form = this.find('form:visible'),
				hdrHeight = this.find('h1:visible').outerHeight(true),
				padding = parseInt(form.css('paddingTop')) 
					+ parseInt(form.css('paddingBottom')),
				newHeight = maxHeight - hdrHeight - padding,
				oldHeight = form.outerHeight(true);
			
			if (oldHeight > newHeight) {
				form.addClass('scrolling');
			}
			else {
				form.removeClass('scrolling');
			}
			if (newHeight > 0) {
				this.find('form:visible').height(newHeight);
			}
		}
	});
    
////////////////////////////////////////////////////////////////////////////////
//                                   View                                     //
////////////////////////////////////////////////////////////////////////////////    

    /**
     * The HudView controls the widgets for the Hud tool.
     */
    var HudView = editor.ToolView.extend({
		init: function(options) {
	        this._super({
	            toolName: 'Heads-Up Displays',
	    		toolTip: 'Create and edit heads-up displays',
	    		elemId: 'hudBtn',
	    		id: 'hud'
	        });
			
	        this.addPanel(new editor.ui.Panel({
				classes: ['hudSidePanel']
			}));
			
			this.sidePanel.addWidget(new CreateWidget());
			this.sidePanel.addWidget(new TreeWidget());
	    }
	});
    
////////////////////////////////////////////////////////////////////////////////
//                                Controller                                  //
////////////////////////////////////////////////////////////////////////////////

    /**
     * The HudController facilitates HudModel and HudView communication by
     * binding event and message handlers.
     */
    var HudController = editor.ToolController.extend({
		init: function() {
			this._super();
    	},
		
	    /**
	     * Binds event and message handlers to the view and model this object 
	     * references.  
	     */
	    bindEvents: function() {
			this._super();
				        
	        var model = this.model,
	        	view = this.view,
				treeWgt = view.sidePanel.hudTreeWidget,
				crtWgt = view.sidePanel.createHudWidget;
	                	        
			// special listener for when the toolbar button is clicked
	        view.addListener(editor.events.ToolModeSet, function(value) {
	            if (model.currentDisplay) {
	            	var isDown = value.newMode === editor.ToolConstants.MODE_DOWN;
					
					if (isDown) {
						model.currentDisplay.currentPage = model.savedPage ? 
							model.savedPage : 0;
						model.currentDisplay.show();
					}
					else {
						model.savedPage = model.currentDisplay.currentPage;
						model.currentDisplay.hide();
					}
	            }
	        }); 
			
			// hud tree specific listeners
			treeWgt.addListener(editor.EventTypes.CreateDisplay, function(name) {
				model.createDisplay(name);
			});
			treeWgt.addListener(editor.EventTypes.SelectHudNode, function(hudObjs) {
				for (var ndx = 0, len = hudObjs.length; ndx < len; ndx++) {
					var hudObj = hudObjs[ndx],
						type = hudObj.getCitizenType().split('.').pop();
					
					switch (type) {
						case 'HudDisplay':
							model.setDisplay(hudObj);
							break;
						case 'HudPage':
							model.setPage(hudObj);
							break;
						case 'HudText':
						case 'HudImage':
							model.setElement(hudObj);
							break;
					}
				}
			});
			
			// hud edit specific listeners
			crtWgt.addListener(editor.EventTypes.CreatePage, function(select) {
				model.createPage(select);
			});
			crtWgt.addListener(editor.EventTypes.RemoveDisplay, function(display) {
				model.removeDisplay(display);
			});
			crtWgt.addListener(editor.EventTypes.RemoveElement, function(element) {
				model.removeElement(element);
			});
			crtWgt.addListener(editor.EventTypes.RemovePage, function(page) {
				model.removePage(page);
			});
			crtWgt.addListener(editor.EventTypes.SaveElement, function(props) {
				model.saveElement(props);
			});
			crtWgt.addListener(editor.EventTypes.SavePage, function(props) {
				model.savePage(props);
			});
			crtWgt.addListener(editor.EventTypes.SetElement, function(elemObj) {
				model.setElement(elemObj.element, elemObj.type);
			});
			
			// view specific listeners
			
			// model specific listeners
			model.addListener(editor.events.Created, function(display) {
				crtWgt.edit(display);
				treeWgt.add(display);
				treeWgt.select(display);
			});
			model.addListener(editor.events.Removed, function(display) {
				treeWgt.remove(display);
			});
			model.addListener(editor.EventTypes.DisplaySet, function(display) {
				crtWgt.edit(display, hemi.hud.HudDisplay.prototype.citizenType);
			});
			model.addListener(editor.EventTypes.ElementCreated, function(element) {
				crtWgt.edit(model.currentPage);
				treeWgt.add(element, model.currentPage);
				treeWgt.select(model.currentPage);
			});
			model.addListener(editor.EventTypes.ElementRemoved, function(element) {
				crtWgt.edit(model.currentPage);
				treeWgt.remove(element);
				treeWgt.select(model.currentPage);
			});
			model.addListener(editor.EventTypes.ElementSet, function(elemObj) {
				crtWgt.edit(elemObj.element, elemObj.type);
			});
			model.addListener(editor.EventTypes.ElementUpdated, function(element) {
				crtWgt.edit(model.currentPage);
				treeWgt.select(model.currentPage);
				treeWgt.update(element);
			});
			model.addListener(editor.EventTypes.PageCreated, function(page) {
				crtWgt.edit(page);
				treeWgt.add(page, model.currentDisplay);
				treeWgt.select(page);
			});
			model.addListener(editor.EventTypes.PageRemoved, function(page) {
				crtWgt.edit(model.currentDisplay);
				treeWgt.remove(page);
				treeWgt.select(model.currentDisplay);
			});
			model.addListener(editor.EventTypes.PageSet, function(page) {
				crtWgt.edit(page, hemi.hud.HudPage.prototype.citizenType);
			});
			model.addListener(editor.EventTypes.HudWorldLoaded, function(displays) {			
				for (var ndx = 0, len = displays.length; ndx < len; ndx++) {
					var display = displays[ndx],
						pages = display.pages;
					
					treeWgt.add(display);
					
					for (var ndx2 = 0, len2 = pages.length; ndx2 < len2; ndx2++) {
						var page = pages[ndx2],
							elems = page.elements;
						
						treeWgt.add(page, display);
					
						for (var ndx3 = 0, len3 = elems.length; ndx3 < len3; ndx3++) {
							var elem = elems[ndx3];							
							treeWgt.add(elem, page);
						}
					}
				}
			});
	    }
	});
	
////////////////////////////////////////////////////////////////////////////////
//								Extra Scripts								  //
////////////////////////////////////////////////////////////////////////////////
	editor.getCss('js/editor/plugins/hud/css/style.css');
	
})();