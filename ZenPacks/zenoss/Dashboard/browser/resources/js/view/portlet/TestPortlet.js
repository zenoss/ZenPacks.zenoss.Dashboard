Ext.define('Zenoss.Dashboard.view.portlet.TestPortlet', {

    extend: 'Zenoss.Dashboard.view.Portlet',
    alias: 'widget.testportlet',
    alternateClassName: ['Zenoss.Dashboard.portlets.TestPortlet'],
    initComponent: function(){

        Ext.apply(this, {
            html: '<h1>test</h1>'
        });

        this.callParent(arguments);
    }
});
