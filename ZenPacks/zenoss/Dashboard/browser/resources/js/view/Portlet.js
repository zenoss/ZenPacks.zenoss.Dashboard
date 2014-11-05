/**
 * @class Zenoss.Dashboard.view.Portlet
 * @extends Ext.panel.Panel
 * A {@link Ext.panel.Panel Panel} class that is managed by {@link Zenoss.dashboard.view.DashboardPanel}.
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
    initComponent: function() {
        this.applyConfig(this.config || {});
        this.callParent(arguments);
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
    }
});
