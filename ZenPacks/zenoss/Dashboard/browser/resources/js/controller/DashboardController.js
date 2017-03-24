/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){
    var router = Zenoss.remote.DashboardRouter;
    /**
     * @class Zenoss.dashboard.DashboardController
     * This class drives the page logic for adding, editing and deleting Dashboards
     * @extends Ext.app.Controller
     */
    Ext.define('Zenoss.Dashboard.controller.DashboardController', {
        models: ['Dashboard'],
        refs: [{
            selector: 'combo[itemId="currentDashboard"]',
            ref: "dashboardSelecter"
        }, {
            selector: 'dashboardpanel',
            ref: "dashboardPanel"
        }],
        views: [
            "PortalPanel",
            "DashboardPanel",
            "PortalDropZone",
            "DashboardContext"
        ],

        extend: 'Ext.app.Controller',
        init: function() {
            this.control({
                'menuitem[itemId="newPortlet"]': {
                    click: this.showAddPortletDialog
                },
                'menuitem[itemId="newDashboard"]': {
                    click: this.showNewDashboardDialog
                },
                'button[itemId="deleteDashboard"]': {
                    click: this.deleteSelectedDashboard
                },
                'button[itemId="editDashboard"]': {
                    click: this.editSelectedDashboard
                },
                'portlet': {
                    close: this.saveDashboardState,
                    resize: this.saveDashboardState
                },
                'portlet tool[itemId="editPortlet"]': {
                    click: this.showEditPortletDialog
                },
                'combo[itemId="currentDashboard"]': {
                    select: this.renderCurrentDashboard
                },
                'portalpanel': {
                    drop:  this.saveDashboardState
                },
                'portlet tool[itemId="fullscreenPortlet"]': {
                    click: this.fullScreenPortlet
                }
            });
        },
        showEditPortletDialog: function(tool) {
            var portlet = tool.up('portlet');
            var win = Ext.create('Zenoss.Dashboard.view.EditPortletDialog', {
                portlet: portlet,
                portletConfig: this.extractPortlet(portlet)
            });

            // save handler for the dialog
            win.query('button[ref="submitButton"]')[0].on('click', function() {
                var updatedConfig = win.getFormValues();
                updatedConfig.previewConfig = win.down("portlet").getConfig();
                portlet.applyConfig(updatedConfig);
                this.saveDashboardState();
                win.close();
            }, this, {single: true});
            win.show();
        },
        showAddPortletDialog: function() {
            var dashboard = this.getCurrentDashboard();
            if (dashboard) {
                if (dashboard.get('locked')) {
                    new Zenoss.dialog.SimpleMessageDialog({
                        message: _t("You cannot add a Portlet while the Dashboard is locked."),
                        title: _t('Locked Dashboard'),
                        buttons: [{
                            xtype: 'DialogButton',
                            text: _t('Close')
                        }]
                    }).show();
		    return;
		}
            if (dashboard.get('uid') === "/zport/dmd/ZenUsers/dashboards/default" &&
                Zenoss.Security.doesNotHavePermission('Manage DMD')) {
                new Zenoss.dialog.SimpleMessageDialog({
                    message: _t("You can not add a Portlet to the default Dashboard"),
                    title: _t('Add portlet'),
                    buttons: [{
                        xtype: 'DialogButton',
                        text: _t('Close')
                    }]
                }).show();
                return;
            }
                var win = Ext.create('Zenoss.Dashboard.view.AddPortletDialog', {});
                // save handler for the dialog
                win.query('button')[0].on('click', function() {
                    var portlet = win.getPortlet();
                    // since the portlet will be destroyed
                    // when the window is closed we need to save its properties
                    // and readd it
                    this.addPortlet(this.extractPortlet(portlet));
                    this.saveDashboardState();
                    win.close();
                }, this, {single: true});
                win.show();
            }
        },
        fullScreenPortlet: function(tool) {
            var portlet = this.extractPortlet(tool.up('portlet')), win;
            Ext.apply(portlet, {
                height: '100%',
                tools: [],
                collapsible: false,
                closable: false
            });
            win = Ext.create('Zenoss.dialog.BaseDialog', {
                maximized: true,
                cls: 'white-background-panel',
                items: [portlet],
                title: portlet.title,
                layout: 'fit',
                closeAction: 'destroy',
                buttons: [{
                    xtype: 'button',
                    ui: 'dialog-dark',
                    text: _t('Close'),
                    handler: function(){
                        win.close();
                    }
                }]
            });
            win.show();
        },
        showNewDashboardDialog: function() {
            var win = Ext.create('Zenoss.Dashboard.view.AddDashboardDialog', {
                currentDashboard: this.getCurrentDashboard()
            });

            // save handler for the dialog
            win.on('newdashboard', function(params) {
                // save the state if the user wishes to clone the existing dashboard
                var cloneExisting = params.cloneExisting;
                delete params.cloneExisting;
                if (cloneExisting) {
                    params.state = this.getCurrentDashboardState();
                }

                router.addDashboard(params, function(response) {
                    // make sure we successfully create the dashboard before closing the dialog
                    if (response.success) {
                        win.close();
                        this.reloadDashboards(params.newId);
                    }
                }, this);
            }, this);

            win.show();
        },
        editSelectedDashboard: function() {
            var dashboard = this.getCurrentDashboard();
            if (dashboard) {
                if (dashboard.get('uid') === "/zport/dmd/ZenUsers/dashboards/default" &&
                    Zenoss.Security.doesNotHavePermission('Manage DMD')) {
                    new Zenoss.dialog.SimpleMessageDialog({
                        message: _t("You can not edit the default Dashboard"),
                        title: _t('Edit Dashboard'),
                        buttons: [{
                            xtype: 'DialogButton',
                            text: _t('Close')
                        }]
                    }).show();
                    return;
                }
                if ( !dashboard.get('isUserDashboardOwner') &&
                    Zenoss.Security.doesNotHavePermission('Manage DMD')) {
                    new Zenoss.dialog.SimpleMessageDialog({
                        message: _t("You don't have permission to edit this Dashboard"),
                        title: _t('Edit Dashboard'),
                        buttons: [{
                            xtype: 'DialogButton',
                            text: _t('Close')
                        }]
                    }).show();
                    return;
                }
                var win = Ext.create('Zenoss.Dashboard.view.EditDashboardDialog', {
                    dashboard: dashboard
                });
                win.on('savedashboard', function(params) {
                    router.saveDashboard(params, function(response) {
                        if (response.success) {
                            win.close();
                            this.reloadDashboards(response.data.id);
                        }
                    }, this);
                }, this);
                win.show();
            }
        },
        getCurrentDashboard: function() {
            // look at what is selected
            var combo = this.getDashboardSelecter(), store = combo.getStore(),
                record = store.findRecord('uid', combo.getValue());
            return record;
        },
        /**
         * Reloads the dashboard drop down and if an id is passed in selects it
         **/
        reloadDashboards: function(id) {
            this.getDashboardSelecter().getStore().load({
                callback: function() {
                    if (id) {
                        var combo = this.getDashboardSelecter(),
                        record = combo.getStore().findRecord('id', id);
                        if (record) {
                            combo.setValue(record.get('uid'));
                            this.renderCurrentDashboard();
                        }
                    }
                },
                scope: this
            });
        },
        deleteSelectedDashboard: function() {
            var dashboard = this.getCurrentDashboard(), me = this;
            if (dashboard) {
                // make sure we always have the default dashboard
                if (dashboard.get('uid') === "/zport/dmd/ZenUsers/dashboards/default") {
                    new Zenoss.dialog.SimpleMessageDialog({
                        message: _t("You can not delete the default Dashboard"),
                        title: _t('Delete Dashboard'),
                        buttons: [{
                            xtype: 'DialogButton',
                            text: _t('Close')
                        }]
                    }).show();
                    return;
                }

                // prompt them to delete the dashboard
                new Zenoss.dialog.SimpleMessageDialog({
                    message: Ext.String.format(_t("Are you sure you want to delete the dashboard, {0} ?"), dashboard.get('id')),
                    title: _t('Delete Dashboard'),
                    width: 350,
                    buttons: [{
                        xtype: 'DialogButton',
                        text: _t('OK'),
                        handler: function() {
                            Zenoss.remote.DashboardRouter.deleteDashboard({
                                uid: dashboard.get('uid')
                            }, function(result) {
                                if (result.success) {
                                    me.reloadDashboards();
                                    var combo = me.getDashboardSelecter();
                                    var store = combo.getStore();
                                    store.remove(me.getCurrentDashboard());
                                    // select the first dashboard
                                    var dashboard = store.getAt(0);
                                    if (dashboard) {
                                        combo.setValue(dashboard.get('uid'));
                                        me.renderCurrentDashboard();
                                    } else {
                                        combo.clearValue();
                                    }
                                }
                            });
                        }
                    }, {
                        xtype: 'DialogButton',
                        text: _t('Cancel')
                    }]
                }).show();
            }
        },
        /**
         * Persists the dashboard state to the server
         **/
        saveDashboardState: function() {
            var dashboard = this.getCurrentDashboard(),
                state = this.getCurrentDashboardState(),
                panel = this.getDashboardPanel();

            // if the dashboard is locked then do not update the server with a new state
            if (dashboard.get('locked') || panel.query('portlet')[0].resizable === false) {
                return;
            }

            dashboard.set('state', state);
            if (!this.saveTask) {
                this.saveTask = new Ext.util.DelayedTask(Ext.bind(this._updateDashboardServerState, this));
            }
            this.saveTask.delay(250);
        },
        _updateDashboardServerState: function() {
            var dashboard = this.getCurrentDashboard(),
                state = this.getCurrentDashboardState();
            state = this.getCurrentDashboardState();
            Zenoss.remote.DashboardRouter.saveDashboardState({
                uid: dashboard.get('uid'),
                audit: dashboard.get('audit'),
                state: state
            });
        },
        extractPortlet: function(portlet) {
            var portletProperties = {
                title: Ext.htmlEncode(portlet.getTitle()),
                refreshInterval: portlet.refreshInterval,
                config: portlet.getConfig(),
                xtype: portlet.getXType(),
                height: portlet.height || 100,
                collapsed: portlet.getCollapsed()
            };
            return portletProperties;
        },
        addPortlet: function(portletConfig) {
            // TODO: find the column that is the smallest
            // add the portlet to it
            var columns = this.getDashboardPanel().query('portalcolumn');
            columns[0].insert(0, portletConfig);
        },
        /**
         * returns a JSON encoded string that is the dashboards "layout".
         * This is saved on the Dashboard object on the server so that when the
         * page is revisited the layout can be reconstituted
         **/
        getCurrentDashboardState: function() {
            var panel = this.getDashboardPanel(),
                state = [], i, j, portlets, portlet, items=[], column,
                columns = panel.query('portalcolumn');
            for (i=0; i< columns.length; i++) {
                column = columns[i];
                portlets = column.query('portlet');
                for (j=0; j < portlets.length; j++) {
                    portlet = portlets[j];
                    portlet.title = Ext.htmlDecode(portlet.title);
                    items.push(this.extractPortlet(portlet));
                }
                state.push({
                    id: 'col-' + i.toString(),
                    items: items
                });
                items = [];
            }
            return Ext.JSON.encode(state);
        },
        /**
         * Draws the dashboard based on the saved state of the selected Dashboard.
         *
         **/
        renderCurrentDashboard: function() {
            var dashboard = this.getCurrentDashboard();
            if (dashboard) {
                var panel = this.getDashboardPanel(), i,
                    state = dashboard.get('state'), columns=[];
                if (state) {
                    columns = Ext.JSON.decode(state);
                    if (columns.length !== dashboard.get('columns')) {
                        columns = this.movePortletsToColumns(columns, dashboard.get('columns'));
                        this.saveDashboardState();
                    }
                } else {
                    // if there is no state (it is a new dashboard or an empty one)
                    // just add placeholders for the columns
                    for (i=0; i<dashboard.get('columns'); i++) {
                        columns.push({
                            id: 'col-' + i.toString(),
                            items: []
                        });
                    }
                }
                this.stripRemovedPortlets(columns);
                Ext.suspendLayouts();
                panel.removeAll();
                panel.add(columns);
                // disable editing features on all the portlets if we are locked
                if (dashboard.get('locked')) {
                    Ext.each(panel.query('portlet'), function(portlet){
                        portlet.lock()
                    });
                }
                // disable editing features on all the portlets in default dashboard
                // if user hasn`t 'Manage DMD' permission
                if (dashboard.get('uid') === "/zport/dmd/ZenUsers/dashboards/default" &&
                    Zenoss.Security.doesNotHavePermission('Manage DMD')) {
                    Ext.each(panel.query('portlet'), function(portlet){
                        portlet.lock()
                    });
                }
                Ext.resumeLayouts(true);
            }
        },
        /**
         * If the portlet was removed then strip it from the state. Otherwise the
         * dashboard will render as blank.
         **/
        stripRemovedPortlets: function(columns) {
            Ext.Array.each(columns, function(column){
                var i =0, alias = "";
                if (!column.items) {
                    return;
                }
                // check to make sure the "xtype" of each item in the column is registered
                // if not remove it
                for (i=0; i < column.items.length; i++ ) {
                    alias = "widget." +  column.items[i].xtype;
                    if (Ext.isEmpty(Ext.ClassManager.getByAlias(alias))) {
                        delete column.items[i];
                    }
                }
            });
        },
        /**
         * This happens when the saved state of the portlet config
         * differs from the saved number of columns for a dashboard
         **/
        movePortletsToColumns: function(columns, columnLength) {
            var portlets = [], i, newColumns=[];
            Ext.each(columns, function(col){
                portlets = portlets.concat(col.items);
            });
            for (i=0; i<columnLength; i++) {
                newColumns.push({
                    id: 'col-' + i.toString(),
                    items: []
                });
            }
            i=0;
            Ext.each(portlets, function(portlet){
                newColumns[i].items.push(portlet);
                i++;
                if (i === columnLength) {
                    i=0;
                }
            });
            return newColumns;
        }
    });
})();
