/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function() {
    Ext.ns('Zenoss.Dashboard');
    Zenoss.Dashboard.DEFAULT_SITEWINDOW_URL = Zenoss.Dashboard.DEFAULT_SITEWINDOW_URL || "https://www2.zenoss.com/in-app-welcome";

    /**
     * @class Zenoss.Dashboard.view.Portlet
     * @extends Ext.panel.Panel
     * A {@link Ext.panel.Panel Panel} class that is managed by {@link Zenoss.dashboard.view.DashboardPanel}.
     * This is the base class for all portlets.
     */
    Ext.define('Zenoss.Dashboard.view.Portlet', {
        extend: 'Ext.panel.Panel',
        alias: 'widget.portlet',
        title: '',
        layout: 'fit',
        anchor: '100%',
        frame: true,
        resizable:true,
        closable: true,
        collapsible: true,
        animCollapse: true,
        height: 200,
        draggable: {
            moveOnDrag: false
        },
        cls: 'x-portlet',
        tools: [{
            xtype: 'tool',
            itemId: 'editPortlet',
            type: 'gear'
        }],
        // defeault to refresh every 5 minutes
        refreshInterval: 300,
        // Override Panel's default doClose to provide a custom fade out effect
        // when a portlet is removed from the portal
        doClose: function() {
            if (!this.closing) {
                this.closing = true;
                this.el.animate({
                    opacity: 0,
                    callback: function(){
                        this.fireEvent('close', this);
                        this[this.closeAction]();
                    },
                    scope: this
                });
            }
        },
        getTitle: function() {
            return this.title;
        },
        constructor: function(config) {
            this.applyConfig(config.config || {});
            this.callParent([config]);
        },
        initComponent: function(){
            this.addEvents(
                /**
                 * @event refresh
                 * Fires when the portlet is set to refresh
                 * @param {Zenoss.Dashboard.view.Portlet} this
                 */
                'refresh',
                /**
                 * @event applyconfig
                 * Fires immediately after the config has been updated on a portlet
                 * @param {Zenoss.Dashboard.view.Portlet} this
                 */
                'applyconfig'
            );

            this.callParent(arguments);
            this.on('afterrender', this.startRefresh, this, {single: true});
        },
        startRefresh: function() {
            this.refreshTask = Ext.TaskManager.start({
                run: Ext.bind(this.refresh, this),
                interval: this.refreshInterval * 1000,
                fireOnStart: false
            });
        },
        refresh: function() {
            this.fireEvent('refresh', this);
            this.onRefresh();
        },
        /**
         * Template method for what happens when a portlet
         * refreshes.
         **/
        onRefresh: function() {

        },
        /**
         * Template method that is called when we are
         * fetching the configuration for this portlet.
         * Anything that can be set by the configuration display should
         * be returned here;
         **/
        getConfig: function() {
            return null;
        },
        getConfigFields: function() {
            var fields = [{
                xtype: 'textfield',
                fieldLabel: _t('Title'),
                name: 'title',
                value: this.getTitle(),
                allowBlank: false
            },{
                xtype: 'numberfield',
                name: 'height',
                fieldLabel: _t('Height'),
                value: this.getEl() ? this.getHeight() : this.height
            }, {
                xtype: 'numberfield',
                name: 'refreshInterval',
                fieldLabel: _t('Refresh Interval (seconds)'),
                value: this.refreshInterval,
                // some of the portlets might be expensive
                // so keep the min refresh sane
                minValue: 60
            }];

            return fields.concat(this.getCustomConfigFields());
        },
        /**
         * Template method that is called when displaying the configuration fields
         * for this portlet.
         * It is expected that the subclasses will return an array of objects
         **/
        getCustomConfigFields: function() {
            return [];
        },
        applyConfig: function(config) {
            if (config.height && config.height != this.height) {
                this.height = config.height;
                if (this.getEl()) {
                    this.setHeight(config.height);
                }
            }
            if (config.title) {
                this.setTitle(config.title);
            }

            // update the refresh interval
            if (config.refresh && config.refresh != this.refresh) {
                this.refreshTask.interval = config.refreshInterval * 1000;
            }

            // by default apply all the config properties to this object
            Ext.apply(this, config);
            this.fireEvent('applyconfig', this);
        }
    });


    /**
     * A simple portlet that lets users define custom HTML to be displayed
     * on the application dashboard. This will execute any javascript that is
     * written.
     **/
    Ext.define('Zenoss.Dashboard.portlets.HTMLPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.htmlportlet',
        height: 100,
        title: 'HTML Portlet',
        content: "<h1>Blank HTMLPortlet</h1>",
        initComponent: function(){

            Ext.apply(this, {
                html: this.content
            });

            this.callParent(arguments);
        },
        getConfig: function() {
            return {
                html: this.content
            };
        },
        applyConfig: function(config) {
            if (config.html && config.html != this.content) {
                this.content = config.html;
                this.update(config.html, true);
            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'textarea',
                fieldLabel: _t('Content'),
                name: 'html',
                value: this.content,
                allowBlank: false,
                height: 100,
                width: 200
            }];
            return fields;
        }
    });

    /**
     * @class Zenoss.Dashboard.stores.Organizer
     * @extend Zenoss.DirectStore
     * Direct store for loading organizers
     */
    Ext.define("Zenoss.Dashboard.stores.Organizer", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DeviceIssueModel',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getSubOrganizers,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Portlet that displays the map for locations
     *
     **/
    Ext.define('Zenoss.Dashboard.portlets.GoogleMaps', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.googlemapportlet',
        title: _t('Google Maps'),
        height: 400,
        pollingrate: 400,
        baselocation: "/zport/dmd/Locations",
        initComponent: function(){

            Ext.apply(this, {
                items: [{
                    xtype: 'iframe',
                    ref: 'mapIframe',
                    src: this.getIFrameSource()
                }]
            });

            this.callParent(arguments);
        },
        getIFrameSource: function() {
            return Ext.String.format('{0}/simpleLocationGeoMap?polling={1}', this.baselocation, this.pollingrate)
        },
        getConfig: function() {
            return {
                baselocation: this.baselocation,
                pollingrate: this.pollingrate
            };
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.onRefresh();
            }
        },
        onRefresh: function() {
            this.down('iframe').load(this.getIFrameSource());
        },
        getCustomConfigFields: function() {
            var store = Ext.create('Zenoss.Dashboard.stores.Organizer', {});
            store.load({
                params: {
                    uid: "/zport/dmd/Locations"
                }
            });

            var fields = [{
                xtype: 'combo',
                name: 'baselocation',
                queryMode: 'local',
                store: store,
                displayField: 'name',
                valueField: 'uid',
                fieldLabel: _t('Base Location'),
                value: this.baselocation
            }, {
                xtype: 'numberfield',
                name: 'pollingrate',
                fieldLabel: _t('Geocode Polling Rate'),
                value: this.pollingrate
            }];
            return fields;
        }
    });



    /**
     * Portlet that loads an Iframe.
     *
     **/
    Ext.define('Zenoss.Dashboard.portlets.SiteWindowPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.sitewindowportlet',
        title: _t('Site Window'),
        height: 400,
        // since it's a url it doesn't really need to refresh all that often
        refreshInterval: 3000,
        siteUrl: Zenoss.Dashboard.DEFAULT_SITEWINDOW_URL,
        initComponent: function(){

            // for the default show specific welcome to this product and version
            if (this.siteUrl === Zenoss.Dashboard.DEFAULT_SITEWINDOW_URL) {
                this.siteUrl += '?v=' + Zenoss.env.ZENOSS_VERSION + '&p=' + Zenoss.env.ZENOSS_PRODUCT;
            }
            Ext.apply(this, {
                items: [{
                    xtype: 'iframe',
                    ref: 'mapIframe',
                    src: this.getIFrameSource()
                }]
            });
            this.callParent(arguments);
        },
        getIFrameSource: function() {
            return this.siteUrl;
        },
        getConfig: function() {
            return {
                siteUrl: this.siteUrl
            };
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.onRefresh();
            }
        },
        onRefresh: function() {
            this.down('iframe').load(this.getIFrameSource());
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'textfield',
                name: 'siteUrl',
                fieldLabel: _t('Site URL'),
                value: this.siteUrl
            }];
            return fields;
        }
    });



    /**
     * @class Zenoss.Dashboard.model.DeviceIssueModel
     * @extends Ext.data.Model
     * Field definitions for the device issues grid
     **/
    Ext.define('Zenoss.Dashboard.model.DeviceIssueModel',  {
        extend: 'Ext.data.Model',
        idProperty: 'uid',
        fields: [
            {name: 'uid'},
            {name: 'name'},
            {name: 'fullOrganizerName'},
            {name: 'events'},
            {name: 'icon'}
        ]
    });

    /**
     * @class Zenoss.Dashboard.stores.DeviceIssues
     * @extend Zenoss.DirectStore
     * Direct store for loading organizers
     */
    Ext.define("Zenoss.Dashboard.stores.DeviceIssues", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DeviceIssueModel',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getDeviceIssues,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Device Issues Portlet. Shows devices that have events
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.DeviceIssues', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.deviceissuesportlet',
        title: _t('Device Issues'),
        height: 400,
        initComponent: function(){
            var store = Ext.create('Zenoss.Dashboard.stores.DeviceIssues', {});
            store.load({
                params: {
                    keys: Ext.pluck(Zenoss.Dashboard.model.DeviceIssueModel.prototype.fields.items, 'name')
                }
            });

            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: store,
                    columns: [{
                        dataIndex:'icon',
                        header: _t('Icon'),
                        width: 40,
                        renderer: function(value) {
                            return Ext.String.format("<image height=\"32\"src='{0}' />", value);
                        }
                    },{
                        dataIndex: 'name',
                        header: _t('Device'),
                        flex: 1,
                        hideable: false,
                        renderer: function(name, row, record) {
                            return Zenoss.render.Device(record.data.uid, name);
                        }
                    },{
                        width: 75,
                        dataIndex: 'events',
                        header: _t('Events'),
                        sortable: false,
                        renderer: function(ev, ignored, record) {
                            var table = Zenoss.render.worstevents(ev),
                            url = record.data.uid + '/devicedetail?filter=default#deviceDetailNav:device_events';
                            if (table){
                                table = table.replace('table', 'table onclick="location.href=\''+url+'\';"');
                            }
                            return table;
                        }
                    }]
                }]
            });
            this.callParent(arguments);
        },
        onRefresh: function() {
            var store = this.down('grid').getStore();
            store.load({
                params: {
                    keys: Ext.pluck(Zenoss.Dashboard.model.DeviceIssueModel.prototype.fields.items, 'name')
                }
            });
        }
    });


    /**
     * @class Zenoss.Dashboard.model.DaemonProcessDown
     * @extends Ext.data.Model
     * Field definitions for the Daemon Process Down Grid
     **/
    Ext.define('Zenoss.Dashboard.model.DaemonProcessDown',  {
        extend: 'Ext.data.Model',
        idProperty: 'process',
        fields: [
            {name: 'host'},
            {name: 'process'},
            {name: 'secondsDown'}
        ]
    });

    /**
     * @class Zenoss.Dashboard.stores.DaemonProcessDown
     * @extend Zenoss.DirectStore
     */
    Ext.define("Zenoss.Dashboard.stores.DaemonProcessDownStore", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DaemonProcessDown',
                initialSortColumn: "process",
                autoLoad: true,
                directFn: Zenoss.remote.DashboardRouter.getDaemonProcessesDown,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Daemon Processes Down Portlet. Shows daemons that are down by the heart beat
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.DaemonProcessDown', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.daemonprocessportlet',
        title: _t('Deamon Processes Down'),
        height: 250,
        initComponent: function(){
            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: Ext.create('Zenoss.Dashboard.stores.DaemonProcessDownStore', {}),
                    columns: [{
                        dataIndex:'host',
                        header: _t('Host'),
                        width: 120
                    },{
                        dataIndex: 'process',
                        header: _t('Daemon Process'),
                        flex: 1,
                        hideable: false
                    },{
                        width: 120,
                        dataIndex: 'secondsDown',
                        header: _t('Seconds Down'),
                        align: 'right',
                        sortable: false
                    },{
                        dataIndex: 'monitor',
                        header: _t('Monitor'),
                        with: 120,
                        hideable: false
                    }]
                }]
            });
            this.callParent(arguments);
        },
        onRefresh: function() {
            this.down('grid').getStore().load();
        }
    });

    /**
     * Production State Portlet. Shows a list of devices and their production state.
     * TODO: This could probably be refactored into a generic device list portlet, like a "device view"
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.ProductionState', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.productionstateportlet',
        title: _t('Production States'),
        height: 250,
        productionStates: [300],
        initComponent: function(){
            Zenoss.env.initProductionStates();
            var store = Ext.create('Zenoss.DeviceStore', {});
            store.setBaseParam('uid', '/zport/dmd/Devices');
            store.setBaseParam('keys', ['uid', 'name', 'productionState']);
            store.setParamsParam('productionState', this.productionStates);
            store.load();
            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: store,
                    columns: [{
                        dataIndex: 'name',
                        header: _t('Device'),
                        flex: 1,
                        hideable: false,
                        renderer: function(name, row, record) {
                            return Zenoss.render.Device(record.data.uid, name);
                        }
                    },{
                        dataIndex: 'productionState',
                        header: _t('Production State'),
                        hideable: false,
                        renderer: function(value) {
                            return Zenoss.env.PRODUCTION_STATES_MAP[value];
                        }
                    }]
                }]
            });
            this.callParent(arguments);
        },
        onRefresh: function() {
            this.down('grid').getStore().load();
        },
        getConfig: function() {
            return {
                productionStates: this.productionStates
            };
        },
        applyConfig: function(config) {
            if (this.rendered) {
                var grid = this.down('grid');
                if (config.productionStates) {
                    grid.getStore().setParamsParam('productionState', config.productionStates);
                    grid.getStore().load();
                }
            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var me = this;
            var fields = [{
                xtype: 'ProductionStateCombo',
                fieldLabel: _t('Production State'),
                name: 'productionStates',
                // bug with multi select combo where we have to update the
                // value after we have rendered otherwise it wont take effect
                value: me.productionStates,
                listeners: {
                    afterrender: function(combo) {
                        combo.setValue(me.productionStates);
                    }
                },
                multiSelect: true,
                height: 100,
                width: 200
            }];
            return fields;
        }
    });



    /**
     * @class Zenoss.Dashboard.stores.WatchListStore
     * @extend Zenoss.DirectStore
     * Direct store for loading organizers
     */
    Ext.define("Zenoss.Dashboard.stores.WatchListStore", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DeviceIssueModel',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getInfos,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Watch List Portlet. Shows a collection organizers and events on those organizers
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.WatchList', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.watchlistportlet',
        title: _t('Watch List'),
        height: 300,
        uids: ['/zport/dmd/Devices/Discovered'],
        initComponent: function(){
            var me = this,
                store = Ext.create('Zenoss.Dashboard.stores.WatchListStore', {});
            store.setBaseParam('uids', this.uids);
            store.setBaseParam('keys', Ext.pluck(Zenoss.Dashboard.model.DeviceIssueModel.prototype.fields.items, 'name'));
            store.load();
            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: store,
                    columns: [{
                        dataIndex: 'name',
                        header: _t('Object'),
                        flex: 1,
                        hideable: false,
                        renderer: function(name, row, record) {
                            return Zenoss.render.link(record.data.uid, null, name);
                        }
                    },{
                        dataIndex: 'events',
                        header: _t('Events'),
                        width: 120,
                        hideable: false,
                        renderer: function(value) {
                            return Zenoss.render.events(value);
                        }
                    }, {
                        xtype: 'actioncolumn',
                        width: 60,
                        handler: function(grid, rowIndex){
                            // get the record and remove it from the store
                            var store = grid.getStore(), record = store.getAt(rowIndex);
                            // filter out the remove uid
                            me.uids = Zenoss.util.filter(me.uids, function(uid) {
                                return uid != record.get('uid')
                            });
                            // update the store params
                            store.setBaseParam('uids', me.uids);
                            store.remove(record);
                        },
                        align: "center",
                        text: _t('Remove'),
                        icon: "/++resource++extjs/examples/restful/images/delete.png",
                        altText: _t('Remove')
                    }]
                }]
            });
            this.callParent(arguments);
        },
        onRefresh: function() {
            this.down('grid').getStore().load();
        },
        getConfig: function() {
            return {
                uids: this.uids
            };
        },
        applyConfig: function(config) {
            if (this.rendered) {
                var grid = this.down('grid');
                if (config.uids && config.uids != this.uids) {
                    grid.getStore().setBaseParam('uids', config.uids);
                    grid.getStore().load();
                }

            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var me = this,
                store = Ext.create('Zenoss.Dashboard.stores.Organizer', {
                    sorters: [{
                        property: 'fullOrganizerName',
                        direction: 'ASC'
                    }]
                });
            store.load({
                params: {
                    uid: '/zport/dmd',
                    keys: ['uid', 'name', 'fullOrganizerName']
                }
            });
            var fields = [{
                xtype: 'combo',
                queryMode: 'local',
                displayField: 'fullOrganizerName',
                valueField: 'uid',
                listConfig: {
                    resizable: true
                },
                store: store,
                editable: true,
                forceSelection: true,
                fieldLabel: _t('Zenoss Objects'),
                itemId: 'organizerCombo',
                width: 225
            }, {
                xtype: 'button',
                paddingLeft: 20,
                anchor: "20%",
                text: _t('Add'),
                handler: function(btn) {
                    var combo = btn.up('form').down('combo[itemId="organizerCombo"]');
                    me.uids.push(combo.getValue());
                    var grid = me.down('grid');
                    grid.getStore().setBaseParam('uids', me.uids);
                    grid.getStore().load();
                }
            }];
            return fields;
        }
    });
    Ext.chart.theme.White = Ext.extend(Ext.chart.theme.Base, {
        constructor: function() {
            Ext.chart.theme.White.superclass.constructor.call(this, {
                axis: {
                    stroke: 'rgb(8,69,148)',
                    'stroke-width': 1
                },
                axisLabel: {
                    fill: 'rgb(8,69,148)',
                    font: '12px Arial',
                    'font-family': '"Arial',
                    spacing: 2,
                    padding: 5,
                    renderer: function(v) { return v; }
                },
                axisTitle: {
                    font: 'bold 18px Arial'
                }
            });
        }
    });

    /**
     *  Portlet that shows the open events by severity
     **/
    Ext.define('Zenoss.Dashboard.portlets.OpenEventsChart', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.openeventsportlet',
        height: 350,
        title: 'Open Events Chart',
        eventClass: "/",
        summaryFilter: "",
        daysPast: 3,
        initComponent: function(){
            Ext.applyIf(this, {
                items:[{
                    animate: true,
                    xtype: 'chart',
                    flex: .4,
                    height: 180,
                    shadow: false,
                    store: Ext.create('Ext.data.ArrayStore', {
                        fields: ['name', 'value'],
                        data: []
                    }),
                    axes: [{
                        type: 'Numeric',
                        position: 'left',
                        fields: ['value'],
                        minorTickSteps: 0,
                        title: _t('Open Events')
                    },{
                        type: 'Category',
                        position: 'bottom',
                        fields: ['name'],
                        title: _t('Severity')
                    }],
                    theme: 'White',
                    series: [{
                        type: 'bar',
                        column: true,
                        axis: 'left',
                        xPadding: 10,
                        yPadding: 2,
                        highlight: true,
                        renderer: function(sprite, record, attr, index, store) {
                            var colors = ["#d60000",  "#ff9711", "#fbd13d", "#0472b8", "#CACACA"];

                            return Ext.apply(attr, {
                                fill: colors[index % colors.length]
                            });
                        },
                        tips: {
                            trackMouse: true,
                            width: 175,
                            height: 22,
                            renderer: function(storeItem, item) {
                                var msg = Ext.String.format(_t("{0} Open {1} Events."), storeItem.get('value'), storeItem.get('name'));
                                this.setTitle(msg);
                            }
                        },
                        label: {
                            display: 'insideEnd',
                            field: 'value',
                            renderer: Ext.util.Format.numberRenderer('0'),
                            orientation: 'horizontal',
                            color: '#FFFFF',
                            'text-anchor': 'middle'
                        },
                        xField: 'name',
                        yField: ['value']
                    }]

                }]

            });
            this.callParent(arguments);
            this.fetchEvents();
        },
        onRefresh: function() {
            this.fetchEvents();
        },
        fetchEvents: function() {
            // gets all the open events for now
            var end = new Date(), start = new Date(), params;
            start.setDate(start.getDate() - this.daysPast);

            params = {
                start: 0,
                limit: 500,
                keys: ['severity'],
                params: {
                    eventClass: this.eventClass,
                    // format a time range Zep can understand
                    firstTime: Ext.Date.format(start, Zenoss.date.ISO8601Long) + "/" + Ext.Date.format(end, Zenoss.date.ISO8601Long),
                    summary: this.summaryFilter
                }
            };
            Zenoss.remote.EventsRouter.query(params, this.loadData, this);
        },
        loadData: function(response) {
            if (!response.success) {
                return;
            }

            // iterate through the events we get back from the server so we can
            // build a store for the chart. The format ends up looking like:
            // [["Critical", 100], ["Error", 1], ...]
            var store = this.down('chart').getStore(), data = [], events = response.events,
                types = ['Critical', 'Error', 'Warning', 'Info', 'Debug'], i, counts = {
                    'critical': 0,
                    'error': 0,
                    'warning': 0,
                    'info': 0,
                    'debug': 0
                };
            for (i=0;i<events.length;i++) {
                counts[Zenoss.util.convertSeverity(events[i].severity)]++;
            }

            Ext.Array.each(types, function(type) {
                data.push([type, counts[type.toLowerCase()]]);
            });
            store.loadData(data);
        },
        getConfig: function() {
            return {
                eventClass: this.eventClass,
                summaryFilter: this.summaryFilter,
                daysPast: this.daysPast
            };
        },
        applyConfig: function(config) {
            var refresh = false;
            if (config.eventClass != this.eventClass || config.summaryFilter != this.summaryFilter || config.daysPast != this.daysPast) {
                refresh = true;
            }
            this.callParent([config]);
            if (refresh) {
                this.fetchEvents();
            }
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'eventclass',
                fieldLabel: _t('Event Class'),
                name: 'eventClass',
                forceSelection: false,
                autoSelect: false,
                value: this.eventClass
            },{
                xtype: 'textfield',
                name: 'summaryFilter',
                fieldLabel: _t('Summary Filter'),
                value: this.summaryFilter
            }, {
                xtype: 'numberfield',
                minValue: 1,
                maxValue: 30,
                fieldLabel: _t('Number of past days to show events for'),
                name: 'daysPast',
                value: this.daysPast
            }];
            return fields;
        }
    });



    /**
     * Network Map Portlet.
     **/
    Ext.define('Zenoss.Dashboard.portlets.NetworkMapPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.networkmapportlet',
        height: 350,
        title: 'Network Map',
        network: null,
        depth: 3,
        initComponent: function(){
            this.networkMapId = Ext.id();
            Ext.apply(this, {
                items: [{
                    xtype: 'container',
                    id: this.networkMapId
                }],
                height: this.height
            });

            this.callParent(arguments);
            this.on('afterrender', this.buildNetworkMap, this, {single: true});
        },
        destroyOldMap: function() {
            var el = Ext.get(this.networkMapId);
            // destroy all the children and build the map
            while (el.dom.firstChild) {
                el.dom.removeChild(el.dom.firstChild);
            }
        },
        resizeSVG: function(panel, width, height) {
            var el = Ext.get(this.networkMapId);
            Ext.get(this.networkMapId).setHeight(height -10);
            Ext.get(this.networkMapId).setWidth(width -10);
            this.svg.attr("height", height);
            this.svg.attr("width", width);
        },
        buildNetworkMap: function() {
            // make sure we have a network first
            if (!this.network) {
                return;
            }
            this.destroyOldMap();
            // resize the svg whenever we are resized
            this.on('resize', this.resizeSVG, this);
            var el = Ext.get(this.networkMapId);
            var self = this, attachPoint = d3.select("#" +this.networkMapId);
            self.imageDir="/zport/dmd/img/icons";
            self.selection = "10.171.54.0";
            var width = Math.max(attachPoint.style('width').replace("px", ""), 600);
            var height = Math.max(attachPoint.style('height').replace("px", ""), 400);

            self.url = "/++resource++zenui/js/zenoss/networkMap/data/2.json";
            self.attachPoint = attachPoint;


            this.nodes = [];
            this.links = [];
            this.force = d3.layout.force()
                .charge(-1000)
                .theta(0)
                .linkDistance(125)
                .size([width, height])
                .nodes(this.nodes)
                .links(this.links)
                .on("tick", Ext.bind(this.tick, this));
            this.svg = this.attachPoint.append("svg")
                .attr("width", width)
                .attr("height", height);
            self.update();
        },
        tick: function() {
            var node = this.svg.selectAll(".node");
            var link = this.svg.selectAll(".link");
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
        },
        onRefresh: function() {
            this.update();
        },
        update: function() {
            var self = this;
            var node = this.svg.selectAll(".node");
            var link = this.svg.selectAll(".link");
            var nodeHeight = 25,
                nodeWidth = 125;
            Zenoss.remote.DashboardRouter.getNetworkMapData({
                uid: self.network,
                depth: self.depth
            }, function(response) {
                if (!response.success) {
                    return;
                }
                var graph = response.data;
                graph.nodes.forEach(function(n){
                    self.nodes.push(n);
                });
                node = node.data(self.force.nodes(), function(d) { return d.id; });
                var nodeContainer = node.enter()
                    .append("g")
                    .attr("class", function(d){ return "node " + d.id; })
                    .call(self.force.drag);
                nodeContainer.append("rect")
                    .attr("width", function(d) {
                        // make the box wider for longer names
                        return Math.max(d.id.length * 8, 125);
                    })
                    .attr("height", nodeHeight)
                    .attr("transform", "translate(" + -nodeWidth/2 + ", " + -nodeHeight/2 + ")")
                    .attr("rx", 10)
                    .attr("ry", 10)
                    .attr("stroke", function(d){ return d.color; });

                nodeContainer.append("text")
                    .text(function(d){ return d.id; })
                    .attr("dx", -30)
                    .attr("dy", 5);
                nodeContainer.append("svg:image")
                    .attr("xlink:href", function(d){ return self.imageDir + "/" + d.icon; })
                    .attr("height", 30)
                    .attr("width", 30)
                    .attr("x", -nodeWidth/2)
                    .attr("y", -15);
                node.exit().remove();

                graph.links.forEach(function(e){
                    var sourceNode = graph.nodes.filter(function(n) { return n.id === e.source; });
                    var targetNode = graph.nodes.filter(function(n) { return n.id === e.target; });
                    self.links.push({source: sourceNode[0], target: targetNode[0]});
                });

                link = link.data(self.force.links(), function(d) { return d.source.id + "-" + d.target.id; });
                link.enter().insert("line", ".node")
                    .attr("class", "link");
                link.exit().remove();

                self.force.start();
            });
        },
        getConfig: function() {
            return {
                network: this.network
            };
        },
        applyConfig: function(config) {
            if (config.depth) {
                this.depth = config.depth;
            }
            if (this.rendered && config.network && config.network != this.network) {
                this.network = config.network;
                this.buildNetworkMap();
            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'combo',
                name: 'network',
                queryMode: 'local',
                store: new Zenoss.NonPaginatedStore({
                    directFn: Zenoss.remote.DashboardRouter.getNetworks,
                    root: 'data',
                    fields: ['uid', 'name']
                }),
                displayField: 'name',
                valueField: 'uid',
                fieldLabel: _t('Network'),
                value: this.network
            }, {
                xtype: 'numberfield',
                name: 'depth',
                fieldLabel: _t('Depth'),
                minValue: 0,
                maxValue: 10,
                value: this.depth
            }];
            fields[0].store.load({});
            return fields;
        }
    });



    /**
     * Grid view of events (a mini-event console)
     **/
    Ext.define('Zenoss.Dashboard.portlets.EventViewPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.eventviewportlet',
        height: 400,
        title: 'Event View',
        stateId: "",
        initComponent: function(){
            this.stateId = this.title + "_STATE";
            var consoleId = Ext.id(),
                columns = this.stripIds(Zenoss.env.COLUMN_DEFINITIONS);
            Ext.apply(this, {
                items: [
                    Ext.create('Zenoss.events.Grid', {
                        id: consoleId,
                        defaultFilters: {
                            severity: [Zenoss.SEVERITY_CRITICAL, Zenoss.SEVERITY_ERROR, Zenoss.SEVERITY_WARNING, Zenoss.SEVERITY_INFO],
                            eventState: [Zenoss.STATUS_NEW, Zenoss.STATUS_ACKNOWLEDGED],
                            // _managed_objects is a global function sent from the server, see ZenUI3/security/security.py
                            tags: _managed_objects()
                        },
                        stateId: this.stateId,
                        stateful: true,
                        columns: columns,
                        enableTextSelection: true,
                        store: Ext.create('Zenoss.events.Store', {}),
                        selModel: Ext.create('Zenoss.EventPanelSelectionModel', {
                            gridId: consoleId
                        })
                    })
                ]
            });

            this.callParent(arguments);
        },
        stripIds: function(columns) {
            var cols = Ext.clone(columns);
            Ext.Array.each(cols, function(col) {
                delete col.id;
            });
            return cols;
        },
        // no user defineable configuration for now
        getConfig: function() {
            return {
                stateId: this.stateId
            };
        },
        applyConfig: function(config) {
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var fields = [];
            return fields;
        }
    });



}());
