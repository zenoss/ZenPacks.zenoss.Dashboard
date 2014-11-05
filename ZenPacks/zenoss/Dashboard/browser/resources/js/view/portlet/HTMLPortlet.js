Ext.define('Zenoss.Dashboard.view.portlet.HTMLPortlet', {

    extend: 'Zenoss.Dashboard.view.Portlet',
    alias: 'widget.htmlportlet',
    alternateClassName: ['Zenoss.Dashboard.portlets.HTMLPortlet'],
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
