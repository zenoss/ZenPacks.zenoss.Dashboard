/**
 * @class Zenoss.Dashboard.view.PortalColumn
 * @extends Ext.container.Container
 * A layout column class
 */
Ext.define('Zenoss.Dashboard.view.PortalColumn', {
    extend: 'Ext.container.Container',
    alias: 'widget.portalcolumn',

    requires: ['Zenoss.Dashboard.view.Portlet'],

    layout: 'anchor',
    defaultType: 'portlet',
    cls: 'x-portal-column'

    // This is a class so that it could be easily extended
    // if necessary to provide additional behavior.
});
