/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){

    Ext.define('Zenoss.Dashboard.view.DashboardContext', {
        extend: 'Ext.panel.Panel',
        alias: ['widget.dashboardcontext'],
        constructor: function(config){
            var me = this;
            // create a radio button with three different options
            config = config || {};
            var context = "current_user";
            if (Ext.isDefined(config.dashboard)) {
                context = config.dashboard.get('contextType');
                ifDefaultDashboard = config.dashboard.get('id') === 'default';
            }

            Ext.applyIf(config, {
                layout: 'vbox',
                defaults: {
                    style: {
                        marginLeft: "10px"
                    }
                },
                items:[{
                    html: _t('Who can view this Dashboard?'),
                    height: 20,
                    style: {
                        marginLeft: "0px"
                    }
                },{
                    xtype: 'radio',
                    name: 'uid',
                    boxLabel: _t('Just me'),
                    checked: context === "current_user",
                    itemId: 'justme',
                    disabled: ifDefaultDashboard || false
                }, {
                    xtype: 'container',
                    layout: 'hbox',
                    items:[{
                        xtype: 'radio',
                        name: 'uid',
                        itemId: 'usergroup',
                        checked: context === "user_groups",
                        boxLabel: _t('User Group')

                    }, {
                        xtype: 'container',
                        width: 10
                    }, {
                        xtype: 'combo',
                        queryMode: 'local',
                        displayField: 'name',
                        editable: false,
                        valueField: 'uid',
                        store: Ext.create('Zenoss.Dashboard.UserGroupStore', {
                            listeners: {
                                load: function(store) {
                                    var combo = me.down('combo');
                                    if (context === "user_groups") {
                                        combo.setValue(config.dashboard.get('contextUid'));
                                    } else {
                                        var first = store.data.first();
                                        if (first) {
                                            combo.setValue(first);
                                        } else {
                                            // there are no user groups set yet, disable the field so it can't be selected
                                            me.down('radio[itemId="usergroup"]').disable();
                                            combo.disable();
                                        }
                                    }
                                }
                            }
                        }),
                        listeners: {
                            afterrender: function(combo) {
                                combo.getStore().load();
                            },
                            select: function(combo) {
                                var userGroup = this.down('radio[itemId="usergroup"]');
                                userGroup.setValue(true);
                            },
                            scope: this
                        }
                    }]
                }, {
                    xtype: 'radio',
                    name: 'uid',
                    checked: context === "global",
                    itemId: 'everyone',
                    boxLabel: _t('Everyone')
                }]
            });
            this.callParent([config]);
        },
        getValue: function() {
            var global = this.down('radio[itemId="everyone"]').getValue(),
                userGroup = this.down('radio[itemId="usergroup"]').getValue();
            // only one can be selected
            if (global) {
                return "/zport/dmd/ZenUsers";
            }

            if (userGroup) {
                return this.down('combobox').getValue();
            }

            return "current_user";
        }
    });
})();
