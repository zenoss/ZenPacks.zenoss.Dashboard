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
     * @class Zenoss.Dashboard.view.Portlet
     * @extends Ext.panel.Panel
     * A {@link Ext.panel.Panel Panel} class that is managed by {@link Zenoss.dashboard.view.DashboardPanel}.
     * This is the base class for all portlets.
     */
    Ext.define('Zenoss.Dashboard.view.Portlet', {
        extend: 'Ext.panel.Panel',
        alias: 'widget.portlet',
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
            type: 'gear'
        }],
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
            }];

            return fields.concat(this.getCustomConfigFields());
        },
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
            Ext.apply(this, config);
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
            }
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
                model: 'Zenoss.model.Basic',
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
            }
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.down('iframe').load(this.getIFrameSource())
            }
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
        height: 400,
        siteUrl: "about:blank",
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
            return this.siteUrl;
        },
        getConfig: function() {
            return {
                siteUrl: this.siteUrl
            }
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.down('iframe').load(this.getIFrameSource())
            }
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

}())
