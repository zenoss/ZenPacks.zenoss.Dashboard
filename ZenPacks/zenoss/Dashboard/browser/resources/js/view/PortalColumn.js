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
    cls: 'x-portal-column',
    minHeight: 200,
    minWidth: 200,
    isDashboardColumn: true,

    /**
     * Invoked after the Container has laid out (and rendered if necessary)
     * its child Components.
     *
     * @param {Ext.layout.container.Container} layout
     *
     * @template
     * @protected
     */
    afterLayout : function(layout) {
        var me = this;
        me.callParent(arguments);
        // clear element height on after layout to get right calculations on dd move;
        me.el.setHeight(null);
    },
    onRemove: function(dashPanel, isDestroying) {
        var me = this,
            ownerCt = me.ownerCt,
            remainingSiblings,
            numRemaining,
            columnWidth,
            totalColumnWidth = 0,
            i;

        // If we've just emptied this column.
        if (ownerCt && me.items.getCount() === 0) {
            // Collect remaining column siblings of the same row, when this one has gone.
            remainingSiblings = Ext.Array.filter(ownerCt.query('>' + me.xtype+ '[rowIndex=' + me.rowIndex + ']'), function(c){
                return c !== me;
            });
            numRemaining = remainingSiblings.length;

            // If this column is not destroyed, then remove this column (unless it is the last one!)
            if (!me.destroying && !me.isDestroyed) {
                ownerCt.remove(me);

                // Down to just one column; it must take up full width
                if (numRemaining === 1) {
                    remainingSiblings[0].columnWidth = 1;
                }
                // If more than one remaining sibling, redistribute columnWidths proportionally so that they
                // still total 1.0
                else {
                    for (i = 0; i < numRemaining; i++) {
                        totalColumnWidth += remainingSiblings[i].columnWidth || 0;
                    }
                    for (i = 0; i < numRemaining; i++) {
                        columnWidth = remainingSiblings[i].columnWidth;
                        remainingSiblings[i].columnWidth = Math.floor(columnWidth / totalColumnWidth * 100) / 100;
                    }
                }

                // Needed if user is *closing* the last portlet in a column as opposed to just dragging it to another place
                // The destruction will not force a layout
                if (isDestroying) {
                    ownerCt.updateLayout();
                }
            }
        }
    }
});
