/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function() {

    var CURRENT_TIME = "0s-ago",
        DATE_RANGES = [
            ["1h-ago", _t('Last Hour')],
            ["1d-ago", _t('Last 24 Hours')],
            ["7d-ago", _t('Last Week')],
            ["30d-ago", _t('Last 30 days')],
            ["1y-ago", _t('Last Year')]
        ],
        RANGE_TO_MILLISECONDS = {
            '1h-ago': 3600000,
            '1d-ago': 86400000,
            '7d-ago': 604800000,
            '30d-ago': 2419200000,
            '1y-ago': 31536000000
        };

    /**
     * Device Chart Portlet. A user selects a device class
     * and a set of graph points, a time range and the portlet
     * displays the series
     **/
    Ext.define('Zenoss.Dashboard.portlets.DeviceChartPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.devicechartportlet',
        height: 500,
        tbar: [
            {
                xtype: 'button',
                text: '&lt;',
                width: 40,
                handler: function(btn, e) {
                    panel = btn.up("devicechartportlet");
                    panel.panLeft();
                }
            }, {
                xtype: 'button',
                text: _t('Zoom In'),
                handler: function(btn, e) {
                    panel = btn.up("devicechartportlet");
                    panel.zoomIn();
                }
            }, {
                xtype: 'button',
                text: _t('Zoom Out'),
                handler: function(btn, e) {
                    panel = btn.up("devicechartportlet");
                    panel.zoomOut();
                }
            }, {
                xtype: 'button',
                text: '&gt;',
                width: 40,
                handler: function(btn, e) {
                    panel = btn.up("devicechartportlet");
                    panel.panRight();
                }
            },
            '->',
            "-",
            {
                xtype: 'drangeselector',
                cls: 'drange_select',
                labelWidth: 40,
                labelAlign: "right",
                listeners: {
                    select: function (self, records, index) {
                        var value = records[0].data.id,
                            panel = self.up("devicechartportlet");

                        // if value is "custom", then reveal the date
                        // picker container
                        if (value === "custom") {
                            panel.showDatePicker();

                            // if user selected the separator, select custom
                        } else if (value === 0) {
                            self.setValue("custom");
                            panel.showDatePicker();

                            // otherwise, update graphs
                        } else {
                            // all ranges are relative to now, so set
                            // end to current time
                            panel.setEndToNow();
                            panel.hideDatePicker();
                            // update drange and start values based
                            // on the new end value
                            panel.setDrange(value);
                        }
                    }
                }
            },
            {
                xtype: "container",
                layout: "hbox",
                cls: "date_picker_container",
                padding: "0 10 0 0",
                items: [
                    {
                        xtype: 'utcdatefield',
                        cls: 'start_date',
                        width: 175,
                        fieldLabel: _t('Start'),
                        labelWidth: 40,
                        labelAlign: "right",
                        format: 'Y-m-d H:i:s',
                        displayTZ: Zenoss.USER_TIMEZONE,
                        listeners: {
                            change: function (self, val) {
                                var chart = self.up("devicechartportlet"), graph, panel;
                                if (chart) {
                                          graph = chart.getGraphs();
                                          if (graph) {
                                            panel = graph[0];
                                          }
                                }
                                if (panel) {
                                    panel.start = moment.utc(self.getValue());
                                }
                            }
                        }
                    }, {
                        xtype: 'utcdatefield',
                        cls: 'end_date',
                        width: 175,
                        fieldLabel: _t('End'),
                        labelWidth: 40,
                        labelAlign: "right",
                        disabled: true,
                        format: 'Y-m-d H:i:s',
                        displayTZ: Zenoss.USER_TIMEZONE,
                        listeners: {
                            change: function (self, val) {
                                var chart = self.up("devicechartportlet"), graph, panel;
                                if (chart) {
                                          graph = chart.getGraphs();
                                          if (graph) {
                                            panel = graph[0];
                                          }
                                }
                                if (panel) {
                                    panel.end = moment.utc(self.getValue());
                                }
                            }
                        }
                    }, {
                        xtype: 'checkbox',
                        cls: 'checkbox_now',
                        fieldLabel: _t('Now'),
                        labelWidth: 40,
                        labelAlign: "right",
                        checked: true,
                        listeners: {
                            change: function (self, val) {
                                var panel = self.up("devicechartportlet");
                                panel.query("datefield[cls='end_date']")[0].setDisabled(val);

                                // if it should be now, update it
                                if (val) {
                                    panel.setEndToNow();
                                    panel.refresh();
                                }
                            }
                        }
                    }
                ]
            },
            '-',
            {
                xtype: 'compgraphrefreshbutton',
                ref: '../refreshmenu',
                iconCls: 'refresh',
                handler: function (button) {
                    var panel = button.up("devicechartportlet");
                    if (panel && panel.isVisible()) {
                        panel.refresh();
                    }
                }
            }
        ],
        pan_factor: 1.25,
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

            this.toolbar = this.getDockedItems()[0];
            this.startDatePicker = this.toolbar.query("utcdatefield[cls='start_date']")[0];
            this.endDatePicker = this.toolbar.query("utcdatefield[cls='end_date']")[0];
            this.nowCheck = this.toolbar.query("checkbox[cls='checkbox_now']")[0];
            this.startDatePicker.setDisplayTimezone(Zenoss.USER_TIMEZONE);
            this.endDatePicker.setDisplayTimezone(Zenoss.USER_TIMEZONE);
            this.drange = this.rangeToMilliseconds(DATE_RANGES[0][0]);
            this.toolbar.query("drangeselector[cls='drange_select']")[0].setValue(DATE_RANGES[0][0]);
            // default start and end values in UTC time
            // NOTE: do not apply timezone adjustments to these values!
            this.start = moment.utc().subtract(this.drange, "ms");
            this.setEndToNow();
            // set start and end dates
            this.updateStartDatePicker();
            this.updateEndDatePicker();
            this.hideDatePicker();
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
        rangeToMilliseconds: function (range) {
            if (RANGE_TO_MILLISECONDS[range]) {
                return RANGE_TO_MILLISECONDS[range];
            }
            return range;
        },
        setLimits: function (start, end) {
            // TODO - validate end is greater than start
            this.start = moment.utc(start);
            this.end = moment.utc(end);

            // these limits require a custom date range
            this.drange = end - start;

            // set the range combo to custom
            this.toolbar.query("drangeselector[cls='drange_select']")[0].setValue("custom");

            // uncheck `now` checkbox since we're using a custom range
            this.nowCheck.setValue(false);

            this.showDatePicker();

            //  set the start and end dates to the selected range.
            this.updateStartDatePicker();
            this.updateEndDatePicker();
        },
        setEndToNow: function () {
            this.end = moment.utc();
            this.updateEndDatePicker();

            // if the "now" checkbox is set and range isn't custom, start time should be updated as well
            if (this.nowCheck.getValue() && this.toolbar.query("drangeselector")[0].getValue() !== "custom") {
                this.start = this.end.clone().subtract(this.drange, "ms");
                this.updateStartDatePicker();
            }
        },
        updateStartDatePicker: function () {
            this.startDatePicker.suspendEvents();
            this.startDatePicker.setValue(this.start.valueOf(), false);
            this.startDatePicker.resumeEvents(false);
        },
        updateEndDatePicker: function () {
            this.endDatePicker.suspendEvents();
            this.endDatePicker.setValue(this.end.valueOf(), false);
            this.endDatePicker.resumeEvents(false);
        },
        hideDatePicker: function () {
            // hide date picker stuff
            this.toolbar.query("container[cls='date_picker_container']")[0].hide();
        },
        showDatePicker: function () {
            // show date picker stuff
            this.toolbar.query("container[cls='date_picker_container']")[0].show();
        },
        setDrange: function (drange) {
            this.drange = drange || this.drange;

            // if drange is relative measurement, convert to ms
            if (!Ext.isNumeric(this.drange)) {
                this.drange = this.rangeToMilliseconds(this.drange);
            }

            // check `now` checkbox since drange is always set from now
            this.nowCheck.setValue(true);

            // update start to reflect new range
            this.start = this.end.clone().subtract(this.drange, "ms");

            this.refresh();
        },
        refresh: function () {
            // if end should be set to `now`, set it
            if (this.nowCheck.getValue()) {
                this.setEndToNow();
            }

            var graphConfig = {
                drange: this.drange,
                // start and end are moments so they need to be
                // converted to millisecond values
                start: this.start.valueOf(),
                end: this.end.valueOf()
            };

            // if we are rendered but not visible do not refresh
            if (this.isVisible()) {
                var gs = this.getGraphs();
                Ext.each(this.getGraphs(), function (g) {
                    g.fireEvent("updateimage", graphConfig, this);
                });
            }
            this.updateStartDatePicker();
            this.updateEndDatePicker();
        },
        getGraphs: function () {
            return this.query('europagraph');
        },
        panLeft: function () {
            var curRange = this.rangeToMilliseconds(this.drange);
            var panAmt = Math.round(curRange - curRange / this.pan_factor);
            var newstart = this.start + panAmt > 0 ? this.start - panAmt : 0;
            var newend = parseInt(newstart + curRange);

            this.setLimits(newstart, newend);
            this.refresh();
        },
        panRight: function () {
            var curRange = this.rangeToMilliseconds(this.drange);
            var panAmt = Math.round(curRange - curRange / this.pan_factor);
            var newstart = this.start + panAmt > 0 ? this.start + panAmt : 0;
            var newend = parseInt(newstart + curRange);

            this.setLimits(newstart, newend);
            this.refresh();
        },
        zoomIn: function () {
            var curRange = this.rangeToMilliseconds(this.drange);
            var zoomedRange = Math.round(curRange / this.pan_factor);
            var delta = Math.floor((curRange - zoomedRange));
            var newstart = this.start + delta > 0 ? this.start + delta : this.start;
            var newend = parseInt(newstart + zoomedRange);

            this.setLimits(newstart, newend);
            this.refresh();
        },
        zoomOut: function () {
            var curRange = this.rangeToMilliseconds(this.drange);
            var zoomedRange = Math.round(curRange * this.pan_factor);
            var delta = Math.floor((zoomedRange - curRange));
            var newstart = this.start - delta > 0 ? this.start - delta : this.start;
            var newend = parseInt(newstart + zoomedRange);

            this.setLimits(newstart, newend);
            this.refresh();
        },
        convertStartToAbsoluteTime: function (start) {
            if (Ext.isNumber(start)) {
                return start;
            }
            return parseInt(new Date() - this.rangeToMilliseconds(start));
        },
        convertEndToAbsolute: function (end) {
            if (end === CURRENT_TIME) {
                return now();
            }
            return end;
        },
        rangeToMilliseconds: function (range) {
            if (RANGE_TO_MILLISECONDS[range]) {
                return RANGE_TO_MILLISECONDS[range];
            }
            return range;
        },
        zoomUpdate: function (gp) {
            this.setLimits(gp.start, gp.end);
            this.refresh();
        },
        applyGraphDefinition: function(response) {
            if (!response.success) {
                return;
            }
            // this variable stores the number of current graphs which are actively loading or refreshing
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
            var deviceClass = this.deviceClass;
            var graphPoints = this.graphPoints;
            var deviceClassCmp = Ext.getCmp('portletDeviceClass');
            var graphPointsCmp = Ext.getCmp('portletGraphPoints');

            if (deviceClassCmp) {
                deviceClass = deviceClassCmp.getValue();
            }
            if (graphPointsCmp) {
                graphPoints = graphPointsCmp.getValue();
            }

            return {
                deviceClass: deviceClass,
                graphPoints: graphPoints
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
                id: 'portletDeviceClass',
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
                            },
                            callback: function (records) {
                                if (records.length) {
                                    graphPointCombo.setDisabled(false);
                                } else {
                                    graphPointCombo.setDisabled(true);
                                }
                            }
                        });
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
                minHeight: 50,
                maxHeight: 200,
                name: 'graphPoints',
                fieldLabel: _t('Select multiple Graph Points'),
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
