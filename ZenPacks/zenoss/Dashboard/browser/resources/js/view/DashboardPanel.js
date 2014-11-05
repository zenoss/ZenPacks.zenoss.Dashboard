/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){
    var portletsContainer = Zenoss.Dashboard.portlets;

    Ext.define('Zenoss.Dashboard.view.AddPortletDialog', {
        extend: 'Zenoss.dialog.BaseWindow',
        alias: ['widget.addportletdialog'],
        constructor: function(config) {
            var me = this;
            config = config || {};
            Ext.applyIf(config, {
                height: 600,
                cls: 'white-background-panel',
                width: 800,
                title: _t('Add Portlet'),
                items: [{
                    xtype: 'form',
                    bodyPadding: 10,
                    height: 575,
                    layout: 'hbox',
                    listeners: {
                        validitychange: function(form, isValid) {
                            me.query('button')[0].setDisabled(!isValid);
                        },
                        scope: this
                    },
                    items: [{
                        xtype: 'panel',
                        layout: 'vbox',
                        flex: .3,
                        items:[ {
                            xtype: 'panel',
                            flex: .2,
                            items: [{
                                xtype: 'combo',
                                labelAlign: "top",
                                fieldLabel: _t('Portlet'),
                                labelWidth: 40,
                                store: Object.keys(Zenoss.Dashboard.portlets),
                                listeners: {
                                    select: this.showConfiguration,
                                    scope: this
                                }
                            }]
                        }, {
                            xtype: 'panel',
                            itemId: 'configuration',
                            flex: .8,
                            layout: 'anchor',
                            defaults: {
                                anchor: "90%",
                                labelAlign: 'top',
                                listeners: {
                                    change: this.updatePreviewTask,
                                    scope: this
                                }
                            }
                        }],
                    },{
                        xtype: 'panel',
                        flex: .6,
                        itemId: 'preview'
                    }],
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
            portlet = Ext.create(portletCls, {});
            items = portlet.getConfigFields();
            configPanel.removeAll();
            configPanel.add([{
                xtype: 'container',
                html: Ext.String.format("<h1>{0}</h1>", _t('Configuration'))
            }].concat(items))

            preview.removeAll();
            preview.add([{
                xtype: 'container',
                html: Ext.String.format("<h1>{0}</h1>", _t('Preview'))
            }, portlet])


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
                me = this, portletConfig = portlet.initialConfig;
            Ext.applyIf(config, {
                height: 600,
                width: 800,
                cls: 'white-background-panel',
                title: _t('Edit Portlet'),
                bodyPadding: 10,
                layout: 'hbox',
                items:[{
                    xtype: 'form',
                    flex: .4,
                    height: 575,
                    width: 750,
                    layout: 'anchor',
                    listeners: {
                        validitychange: function(form, isValid) {
                            me.query('button')[0].setDisabled(!isValid);
                        },
                        scope: this
                    },
                    defaults: {
                        anchor: "90%",
                        labelAlign: 'top',
                        listeners: {
                            change: this.updatePreviewTask,
                            scope: this
                        }
                    },
                    items: [{
                        xtype: 'container',
                        html: Ext.String.format("<h1>{0}</h1>", _t('Configuration'))
                    }].concat(portlet.getConfigFields())
                },{
                    xtype: 'panel',
                    flex: .6,
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
            var me = this;
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
                    allowBlank: false
                }, {
                    xtype: 'dashboardcontext'
                }, {
                    xtype: 'numberfield',
                    fieldLabel: _t('Number of Columns'),
                    minValue: 0,
                    maxValue: 10,
                    value: 3
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
                            columns: me.down('numberfield').getValue()
                        };

                        me.fireEvent('newdashboard', params);
                    }
                }, Zenoss.dialog.CANCEL]
            });
            this.callParent([config]);
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
                    value: config.dashboard.get('id')
                }, {
                    xtype: 'dashboardcontext',
                    dashboard: config.dashboard
                }, {
                    xtype: 'numberfield',
                    fieldLabel: _t('Number of Columns'),
                    minValue: 0,
                    maxValue: 10,
                    value: config.dashboard.get('columns')
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

        getTools: function(){
            return [{
                xtype: 'tool',
                type: 'gear',
                handler: function(e, target, panelHeader, tool){
                    var portlet = panelHeader.ownerCt;
                    portlet.setLoading('Loading...');
                    Ext.defer(function() {
                        portlet.setLoading(false);
                    }, 2000);
                }
            }];
        },

        initComponent: function() {

            Ext.applyIf(this, {
                dockedItems:[{
                    dock: 'top',
                    xtype: 'toolbar',
                    items:[{
                        xtype: 'combo',
                        labelWidth: 80,
                        fieldLabel: _t('Dashboards'),
                        queryMode: 'local',
                        itemId: 'currentDashboard',
                        displayField: 'id',
                        valueField: 'uid',
                        store: Ext.create('Zenoss.Dashboard.model.DashboardStore', {}),
                        listeners: {
                            afterrender: function(combo) {
                                combo.getStore().on('load', function(){
                                    var recordSelected = combo.getStore().getAt(0);
                                    combo.setValue(recordSelected.get('uid'));
                                    combo.fireEvent('select', [combo, recordSelected]);
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
                        iconCls:'delete'
                    },{
                        xtype: 'button',
                        iconCls: 'customize'
                    }]
                }],
                items: []
            });

            this.callParent(arguments);
        }
    });

}())