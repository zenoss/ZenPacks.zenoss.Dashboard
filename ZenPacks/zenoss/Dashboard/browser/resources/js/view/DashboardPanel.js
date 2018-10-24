/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){

    Ext.define('Zenoss.Dashboard.view.AddPortletDialog', {
        extend: 'Zenoss.dialog.BaseWindow',
        alias: ['widget.addportletdialog'],
        constructor: function(config) {
            var me = this, data = [], store;

            // build an array of
            // [portletId, portletName] for use in the Portlet Combobox
            Ext.each(Object.keys(Zenoss.Dashboard.portlets), function(portletId) {
                var portlet = Zenoss.Dashboard.portlets[portletId];
                data.push([portletId, portlet.prototype.title]);
            });
            store = Ext.create('Ext.data.ArrayStore', {
                data: data,
                fields: [
                       'id',
                       'title'
                    ],
                sorters: [{
                    property: 'title',
                    direction: 'ASC'
                }]
            });

            config = config || {};

            Ext.applyIf(config, {
                height: 600,
                cls: 'white-background-panel',
                width: 800,
                layout: 'form',
                title: _t('Add Portlet'),
                items: [{
                    xtype: 'form',
                    bodyPadding: 10,
                    height: 575,
                    layout: 'hbox',
                    listeners: {
                        validitychange: function(form, isValid) {
                            me.query('button[ref="submitButton"]')[0].setDisabled(!isValid);
                        },
                        scope: this
                    },
                    items: [{
                        xtype: 'panel',
                        layout: 'vbox',
                        flex: 0.4,
                        height: 450,
                        items:[ {
                            xtype: 'panel',
                            flex: 0.1,
                            width: "100%",
                            height: 100,
                            items: [{
                                xtype: 'combo',
                                labelAlign: "top",
                                fieldLabel: _t('Portlet'),
                                labelWidth: 40,
                                displayField: 'title',
                                valueField: 'id',
                                store: store,
                                listeners: {
                                    select: this.showConfiguration,
                                    scope: this
                                }
                            }]
                        }, {
                            xtype: 'panel',
                            itemId: 'configuration',
                            flex: 0.9,
                            width: "100%",
                            layout: 'anchor',
                            defaults: {
                                anchor: "90%",
                                labelAlign: 'top'
                            }
                        }]
                    },{
                        xtype: 'panel',
                        flex: 0.6,
                        itemId: 'preview'
                    }]
                }],
                buttons: [{
                    xtype: 'button',
                    ref: 'submitButton',
                    ui: 'dialog-dark',
                    text: _t('Add'),
                    disabled: true
                }, {
                    xtype: 'button',
                    ui: 'dialog-dark',
                    text: _t('Close'),
                    handler: Ext.bind(function(){
                        this.close();
                    }, this)
                }]
            });
            this.callParent([config]);
        },
        getPortlet: function() {
            return this.down('portlet');
        },
        showConfiguration: function(combo) {
            var configPanel = this.down('panel[itemId="configuration"]'),
                preview = this.down('panel[itemId="preview"]'),
                portletCls = "Zenoss.Dashboard.portlets." + combo.getValue(), items, portlet;
            portlet = Ext.create(portletCls, {
                // make sure the header gear icon is not displayed
                tools: [],
                draggable: false,
                collapsible: false,
                closable: false
            });
            items = portlet.getConfigFields();
            configPanel.removeAll();
            configPanel.add([{
                xtype: 'container',
                html: Ext.String.format("<h1>{0}</h1>", _t('Configuration'))
            }].concat(items));

            // set up event listeners for changing to update the preview
            // do this here instead of in the config so portlets configuration fields
            // can set up their own listeners
            Ext.each(configPanel.query('field'), function(field){
                field.on('change', this.updatePreviewTask, this);
            }, this);

            // Set up the preview on the right hand side
            preview.removeAll();
            preview.add([{
                xtype: 'container',
                html: Ext.String.format("<h1>{0}</h1>", _t('Preview'))
            }, portlet]);
            // when they resize the portlet update the number in the height field
            portlet.on('resize', function(port, width, height) {
                var cmp = this.down('numberfield[name="height"]');
                if (cmp) {
                    cmp.setValue(height);
                }
            }, this);
            // focus on the text field for editing the name when the dialog is opened
            configPanel.down('textfield[name="title"]').focus(false, 250);
        },
        updatePreviewTask: function() {
            if (!this.updateTask) {
                this.updateTask = new Ext.util.DelayedTask(Ext.bind(this.updatePreview, this));
            }
            this.updateTask.delay(250);
        },
        updatePreview: function() {
            var portlet = this.down('portlet'),
                values = this.down('form').getForm().getFieldValues();
            portlet.applyConfig(values);
        }
    });


    Ext.define('Zenoss.Dashboard.view.EditPortletDialog', {
        extend: 'Zenoss.dialog.BaseWindow',
        alias: ['widget.editportletdialog'],
        constructor: function(config) {
            config = config || {};
            if (!config.portlet) {
                throw "EditPortletDialog received no portlet";
            }
            var portlet = config.portlet,
                me = this, portletConfig = config.portletConfig;
            portletConfig.tools = [];
            portletConfig.draggable = false;
            Ext.applyIf(config, {
                height: 600,
                width: 800,
                cls: 'white-background-panel',
                title: _t('Edit Portlet'),
                bodyPadding: 10,
                layout: 'hbox',
                items:[{
                    xtype: 'form',
                    flex: 0.4,
                    height: 575,
                    width: 750,
                    layout: 'anchor',
                    listeners: {
                        validitychange: function(form, isValid) {
                            me.query('button[ref="submitButton"]')[0].setDisabled(!isValid);
                        },
                        afterrender: function(form) {
                            Ext.each(form.query('field'), function(field){
                                field.on('change', me.updatePreviewTask, me);
                            });
                        },
                        scope: this
                    },
                    defaults: {
                        anchor: "90%",
                        labelAlign: 'top',
                        style: {
                            marginTop: "10px"
                        }
                    },
                    items: [{
                        xtype: 'container',
                        html: Ext.String.format("<h1>{0}</h1>", _t('Configuration'))
                    }].concat(portlet.getConfigFields())
                },{
                    xtype: 'panel',
                    flex: 0.6,
                    height: 575,
                    itemId: 'preview',
                    items: [{
                        xtype: 'container',
                        html: Ext.String.format("<h1>{0}</h1>", _t('Preview'))
                    }, portletConfig]
                }],
                buttons: [{
                    xtype: 'button',
                    ref: 'submitButton',
                    ui: 'dialog-dark',
                    text: _t('Save'),
                    disabled: true
                }, {
                    xtype: 'button',
                    ui: 'dialog-dark',
                    text: _t('Close'),
                    handler: Ext.bind(function(){
                        this.close();
                    }, this)
                }]
            });
            this.callParent([config]);

        },
        initComponent: function() {
            this.callParent(arguments);
            // when they resize the portlet update the number
            this.down('portlet').on('resize', function(portlet, width, height) {
                var cmp = this.down('numberfield[name="height"]');
                if (cmp) {
                    cmp.setValue(height);
                }
            }, this);
        },
        getFormValues: function() {
            return this.down('form').getForm().getFieldValues();
        },
        updatePreviewTask: function() {
            if (!this.updateTask) {
                this.updateTask = new Ext.util.DelayedTask(Ext.bind(this.updatePreview, this));
            }
            this.updateTask.delay(250);
        },
        updatePreview: function() {
            var portlet = this.down('portlet'),
                values = this.down('form').getForm().getFieldValues();
            portlet.applyConfig(values);
        }
    });

    Ext.define('Zenoss.Dashboard.view.AddDashboardDialog', {
        extend: 'Zenoss.FormDialog',
        constructor: function(config) {
            var me = this,
                hideCloneOption = true, dashboardId;

            if (config.currentDashboard) {
                hideCloneOption = false;
                dashboardId = config.currentDashboard.get('id');
            }

            Ext.applyIf(config, {
                title: _t('Add a New Dashboard'),
                height: 300,
                width: 325,
                layout: 'anchor',
                defaults: {
                    anchor: "90%",
                    labelAlign: "top",
                    style: {
                        marginTop: "10px"
                    }
                },
                items: [{
                    xtype: 'textfield',
                    maskRe: /[a-zA-Z0-9-_~,.$\(\)# @]/,
                    fieldLabel: _t('Dashboard Name'),
                    allowBlank: false,
                    validator: Ext.bind(function(value) {
                        // validate new dashboard name
                        return this.dashboardIds.indexOf(value) === -1 ? true : _t('Name is already in use');
                    }, this)
                }, {
                    xtype: 'dashboardcontext'
                }, {
                    xtype: 'numberfield',
                    fieldLabel: _t('Number of Columns'),
                    minValue: 1,
                    maxValue: 10,
                    value: 3
                }, {
                    xtype: 'checkbox',
                    itemId: 'clone',
                    fieldLabel: Ext.String.format(_t('Clone from dashboard ({0})'), dashboardId),
                    value: 0,
                    hidden: hideCloneOption
                }],
                buttons: [{
                    xtype: 'DialogButton',
                    disabled: true,
                    ui: 'dialog-dark',
                    text: _t('Create'),
                    handler: function() {
                        var params = {
                            newId: me.down('textfield').getValue(),
                            uid: me.down('dashboardcontext').getValue(),
                            columns: me.down('numberfield').getValue(),
                            cloneExisting: me.down('checkbox[itemId="clone"]').getValue()
                        };

                        me.fireEvent('newdashboard', params);
                    }
                }, Zenoss.dialog.CANCEL]
            });

            this.callParent([config]);
            var dashboardsStore = Ext.getStore('currentDashboard');
            // collect already stored dashboard id's to validate later "Dashboard Name" field;
            this.dashboardIds = dashboardsStore.collect('id');
        },
        initComponent: function() {
            this.addEvents('newdashboard');
            this.callParent(arguments);
        }
    });

    Ext.define('Zenoss.Dashboard.view.EditDashboardDialog', {
        extend: 'Zenoss.FormDialog',
        constructor: function(config) {
            var me = this;
            Ext.applyIf(config, {
                title: Ext.String.format(_t('Edit Dashboard {0}'), config.dashboard.get('id')),
                height: 340,
                width: 325,
                layout: 'anchor',
                defaults: {
                    anchor: "90%",
                    labelAlign: "top",
                    style: {
                        marginTop: "10px"
                    }
                },
                items: [{
                    xtype: 'textfield',
                    maskRe: /[a-zA-Z0-9-_~,.$\(\)# @]/,
                    fieldLabel: _t('Dashboard Name'),
                    allowBlank: false,
                    disabled: config.dashboard.get('id') === 'default',
                    value: config.dashboard.get('id')
                }, {
                    xtype: 'dashboardcontext',
                    dashboard: config.dashboard
                }, {
                    xtype: 'numberfield',
                    fieldLabel: _t('Number of Columns'),
                    minValue: 1,
                    maxValue: 10,
                    value: config.dashboard.get('columns')
                }, {
                    xtype: 'checkbox',
                    fieldLabel: _t('Audit logs?'),
                    name: 'audit',
                    itemId: 'audit',
                    checked: config.dashboard.get('audit')
                }, {
                    xtype: 'checkbox',
                    fieldLabel: _t('Lock from updates?'),
                    name: 'locked',
                    itemId: 'locked',
                    checked: config.dashboard.get('locked')
                }],
                buttons: [{
                    xtype: 'DialogButton',
                    ui: 'dialog-dark',
                    text: _t('Save'),
                    handler: function() {
                        var params = {
                            newId: me.down('textfield').getValue(),
                            contextUid: me.down('dashboardcontext').getValue(),
                            columns: me.down('numberfield').getValue(),
                            locked: me.down('#locked').getValue(),
                            audit: me.down('#audit').getValue(),
                            uid: me.dashboard.get('uid')
                        };
                        me.fireEvent('savedashboard', params);
                    }
                }, Zenoss.dialog.CANCEL]
            });
            this.callParent([config]);
        },
        initComponent: function() {
            this.addEvents('savedashboard');
            this.callParent(arguments);
        }
    });

    Ext.define('Zenoss.Dashboard.view.DashboardPanel', {
        extend: 'Zenoss.Dashboard.view.PortalPanel',

        alias: 'widget.dashboardpanel',

        initComponent: function() {

            Ext.applyIf(this, {
                dockedItems:[{
                    dock: 'top',
                    xtype: 'toolbar',
                    items:[{
                        xtype: 'combo',
                        labelWidth: 80,
                        width: 250,
                        fieldLabel: _t('Dashboards'),
                        queryMode: 'local',
                        stateId: 'selected_dashboard',
                        stateful: true,
                        itemId: 'currentDashboard',
                        displayField: 'idwithOwner',
                        valueField: 'uid',
                        store: Ext.create('Zenoss.Dashboard.model.DashboardStore', {storeId: 'currentDashboard'}),
                        listeners: {
                            afterrender: function(combo) {
                                combo.getStore().on('load', function() {
                                    var  idx, recordSelected;
                                    idx = combo.getStore().findExact('uid', combo.getValue());
                                    // if we don't have anything set by the "state" of the combo
                                    // then go ahead and force select the first item
                                    if (!combo.getValue() || idx === -1) {
                                        recordSelected = combo.getStore().getAt(0);
                                        if (recordSelected) {
                                            combo.setValue(recordSelected.get('uid'));
                                        } else {
                                            combo.clearValue();
                                        }
                                    }
                                    // this actually renders the dashboard
                                    combo.fireEvent('select', [combo, combo.getValue()]);
                                }, this, {single: true});
                            }
                        }
                    },'->',{
                        xtype: 'button',
                        iconCls:'add',
                        menu: [{
                            text: _t('Add Portlet'),
                            itemId: 'newPortlet'
                        }, {
                            text: _t('New Dashboard'),
                            itemId: 'newDashboard'
                        }]
                    },{
                        xtype:'button',
                        iconCls:'delete',
                        itemId: 'deleteDashboard'
                    },{
                        xtype: 'button',
                        iconCls: 'customize',
                        itemId: 'editDashboard'
                    }]
                }],
                items: []
            });

            this.callParent(arguments);
        }
    });

}());
