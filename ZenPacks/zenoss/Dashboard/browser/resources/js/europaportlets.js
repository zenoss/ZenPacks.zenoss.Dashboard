/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function() {

    /**
     * Device Chart Portlet. A user selects a device class
     * and a set of graph points, a time range and the portlet
     * displays the series
     **/
    Ext.define('Zenoss.Dashboard.portlets.DeviceChartPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.devicechartportlet',
        height: 500,
        overflowY: 'auto',
        title: 'Device Chart',
        deviceClass: '/',
        graphPoints: [],
        initComponent: function(){

            Ext.apply(this, {
                items: [{
                    xtype: 'container',
                    itemId: 'graphContainer'
                }]
            });

            this.callParent(arguments);
        },
        fetchGraphDefinition: function() {
            if (this.deviceClass && this.graphPoints.length) {
                Zenoss.remote.DashboardRouter.getDeviceClassGraphDefinition({
                    deviceClass: this.deviceClass,
                    graphPointsUids: this.graphPoints
                }, this.applyGraphDefinition, this);
            }
        },
        getGraphPointIds: function() {
            var ids = [];
            Ext.each(this.graphPoints, function(gp){
                var pieces = gp.split("/");
                ids.push(pieces.pop());
            });
            return ids.join(" | ");
        },
        applyGraphDefinition: function(response) {
            if (!response.success) {
                return;
            }
            var container = this.down('container[itemId="graphContainer"]'), graph;
            // create the europa graph
            graph = {
                xtype: 'europagraph',
                graphId: Ext.id(),
                graphTitle: this.deviceClass,
                description: this.getGraphPointIds(),
                datapoints: response.data
            };
            // add it to the container
            container.removeAll();
            container.add(graph);
        },
        getConfig: function() {
            return {
                deviceClass: this.deviceClass,
                graphPoints: this.graphPoints
            };
        },
        applyConfig: function(config) {
            // if the device class or graph definitions change then
            // rebuild the graph

            // device class
            var rebuildGraph = false;
            if (config.deviceClass && this.deviceClass !== config.deviceClass) {
                rebuildGraph = true;
            }

            // selected graph points
            if (config.graphPoints && this.graphPoints !== config.graphPoints) {
                rebuildGraph = true;
            }

            // the parent applies the properties of config to "this"
            this.callParent([config]);
            if (rebuildGraph){
                this.fetchGraphDefinition();
            }
        },
        onRefresh: function() {
            this.down('europagraph').updateGraph({});
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'combo',
                name: 'deviceClass',
                fieldLabel: _t('Select a device class'),
                store: new Zenoss.NonPaginatedStore({
                    directFn: Zenoss.remote.DeviceRouter.getDeviceClasses,
                    root: 'deviceClasses',
                    fields: ['name']
                }),
                width: 175,
                listeners: {
                    select: function(combo) {
                        var graphPointCombo = Ext.getCmp('portletGraphPoints'),
                            store = graphPointCombo.getStore();
                        store.load({
                            params: {
                                deviceClass: combo.getValue()
                            }
                        });
                        graphPointCombo.setDisabled(false);
                    }
                },
                listConfig: {
                    resizable: true
                },
                valueField: 'name',
                displayField: 'name',
                value: this.deviceClass
            }, {
                id: 'portletGraphPoints',
                xtype: 'multiselect',
                maxHeight: 200,
                name: 'graphPoints',
                fieldLabel: _t('Select multiple Graph Points'),
                disabled: !(this.graphPoints.length),
                value: this.graphPoints,
                displayField: 'name',
                valueField: 'uid',
                store: new Zenoss.NonPaginatedStore({
                    directFn: Zenoss.remote.DashboardRouter.getDeviceClassGraphPoints,
                    root: 'data',
                    fields: ['uid', 'name']
                })
            }];
            // load the stores
            fields[0].store.load();
            fields[1].store.load({
                params: {
                    deviceClass: this.deviceClass
                }
            });
            return fields;
        }
    });







}());
