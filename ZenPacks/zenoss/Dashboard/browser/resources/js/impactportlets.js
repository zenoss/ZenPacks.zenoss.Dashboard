/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2015, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function() {


    Ext.define('Zenoss.Dashboard.ImpactPortletGridModel',{
        extend: 'Ext.data.Model',
        fields: [
            {name: 'node', type: 'object'},
            {name: 'states', type: 'object'}
        ]
    });

    Ext.define("Zenoss.Dashboard.ImpactPortletGrid", {
        alias:['widget.dashboardimpactportletgrid'],
        extend:"Ext.grid.GridPanel",
        constructor: function(config){
            config = config || {};
            Ext.applyIf(config, {
                autoScroll: true,
                scroll: 'both',
                store: {
                    type: 'json',
                    data: [],
                    model: 'Zenoss.Dashboard.ImpactPortletGridModel',
                    sorters: [{
                        sorterFn: function(o1, o2) {
                            var name1 = o1.get('node').name,
                            name2 = o2.get('node').name;
                            if (name1 === name2) {
                                return 0;
                            }
                            return name1 < name2 ? -1 : 1;
                        }
                    }]
                },
                columns: [{
                    dataIndex: 'node',
                    header: _t('Name'),
                    flex: 1,
                    hideable: false,
                    sortable: false,
                    renderer: function(node, row, record) {
                        return '<span style="padding-left:5px">' +Zenoss.render.link(node.uid, null, node.name) + '</span>';
                    }
                }, {
                    dataIndex: 'states',
                    header: _t('Health'),
                    hideable: false,
                    sortable: false,
                    renderer: function(states, row, record) {
                        return Zenoss.render.ServiceHealth(states.states, null);
                    }
                }]
            });
            this.callParent([config]);
        }
    });

    /**
     * Impact Portlet. Shows the health of the impact organizers
     * and a set of graph points, a time range and the portlet
     * displays the series
     **/
    Ext.define('Zenoss.Dashboard.portlets.ImpactPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.impactgridportlet',
        height: 500,
        title: 'Impact Services',
        serviceOrg: '/',
        initComponent: function(){

            Ext.apply(this, {
                items: [{
                    xtype: 'dashboardimpactportletgrid',
                    itemId: 'impactGrid'
                }]
            });

            this.callParent(arguments);
            this.loadData();
        },
        getConfig: function() {
            return {
                serviceOrg: this.serviceOrg
            };
        },
        applyConfig: function(config) {
            if (config.serviceOrg !== this.serviceOrg && Ext.isDefined(config.serviceOrg)) {
                this.serviceOrg = config.serviceOrg;
                this.loadData();
            }
            // the parent applies the properties of config to "this"
            this.callParent([config]);
        },
        loadData: function() {
            var params = {
                uid: '/zport/dmd/DynamicServices' + this.serviceOrg,
                keys: ['name', 'serviceStateDetails']
            };
            Zenoss.remote.ImpactRouter.getInfo(params, function(response){
                if (!response.success) {
                    return;
                }
                this.down('dashboardimpactportletgrid').getStore().loadData(response.data.serviceStateDetails.nodes);
            }, this);
        },
        onRefresh: function() {
            this.loadData();
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'combo',
                name: 'serviceOrg',
                fieldLabel: _t('Service class'),
                labelStyle: 'color: #888888; font-size: 9px;',
                allowBlank: false,
                editable: false,
                listConfig: {
                    resizable: true
                },
                store: new Ext.data.DirectStore({
                    directFn: Zenoss.remote.ImpactRouter.getServiceOrganizers,
                    root: 'serviceOrgs',
                    fields: ['name']
                }),
                valueField: 'name',
                width: 300,
                displayField: 'name',
                value: this.serviceOrg
            }];
            // load the stores
            fields[0].store.load();
            return fields;
        }
    });







}());
