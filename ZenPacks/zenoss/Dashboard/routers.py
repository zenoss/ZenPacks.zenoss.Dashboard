##############################################################################
#
# Copyright (C) Zenoss, Inc. 2014, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################
from Products.ZenUtils.Ext import DirectRouter
from Products import Zuul
from Products.Zuul.interfaces import IInfo
from Products.Zuul.decorators import require
from Products.ZenUtils.Ext import DirectResponse
from Products.ZenMessaging.audit import audit
from Products.ZenModel.ZenossSecurity import ZEN_VIEW, ZEN_DELETE
from AccessControl import getSecurityManager


class DashboardRouter(DirectRouter):
    def _getFacade(self):
        return Zuul.getFacade('dashboard', self.context)


    def getAvailableDashboards(self):
        facade = self._getFacade()
        results = facade.getAvailableDashboards()
        return DirectResponse.succeed(data=Zuul.marshal(results))

    def addDashboard(self, newId, uid, columns, state=None):
        facade = self._getFacade()
        result = facade.addDashboard(newId, uid, columns, state)
        audit('UI.Dashboard.Add', uid, newId=newId)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def deleteDashboard(self, uid):
        user = getSecurityManager().getUser()
        facade = self._getFacade()
        obj = facade._getObject(uid)
        # can't delete the default dashboard
        if obj.getPrimaryId() == "/zport/dmd/ZenUsers/dashboards/default":
            return
        if obj.owner != user.getId() and not Zuul.checkPermission(ZEN_DELETE, facade.context):
            raise Exception("You have no permission to delete this dashboard")
        result = facade.deleteObject(uid)
        audit('UI.Dashboard.Remove', uid)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def saveDashboard(self, **data):
        facade = self._getFacade()
        result = facade.saveDashboard(data)
        if data.get('audit'): audit('UI.Dashboard.Edit', data_=data)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def saveDashboardState(self, **data):
        """
        Updates the state attribute of the dashboard. This is called everytime a portlet is
        either dragged or resized.
        """
        facade = self._getFacade()
        result = facade.saveDashboardState(data.get('uid'), data.get('state'))
        if data.get('audit'): audit('UI.Dashboard.Edit', state=data.get('state'))
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def getCurrentUsersGroups(self):
        facade = self._getFacade()
        result = facade.getCurrentUsersGroups()
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def getSubOrganizers(self, uid, keys=None):
        facade = self._getFacade()
        result = facade.getSubOrganizers(uid)
        return DirectResponse.succeed(data=Zuul.marshal(result, keys=keys))

    def getTopLevelOrganizers(self, uid, keys=None):
        facade = self._getFacade()
        result = facade.getTopLevelOrganizers(uid)
        return DirectResponse.succeed(data=Zuul.marshal(result, keys=keys))

    def getWatchListTargets(self, uid=None, keys=None, query=None):
        facade = self._getFacade()
        result = facade.getWatchListTargets(uid, query=query)
        return DirectResponse.succeed(data=Zuul.marshal(result, keys=keys))

    def getDeviceIssues(self, keys=None):
        facade = self._getFacade()
        result = facade.getDeviceIssues()
        return DirectResponse.succeed(data=Zuul.marshal(result, keys=keys))

    def getDaemonProcessesDown(self):
        facade = self._getFacade()
        result = facade.getDaemonProcessesDown()
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def getInfos(self, uids, keys):
        facade = self._getFacade()
        devices = [facade._getObject(uid) for uid in uids]
        infos = [IInfo(dev) for dev in devices if dev.checkRemotePerm(ZEN_VIEW, dev)]
        return DirectResponse.succeed(data=Zuul.marshal(infos, keys=keys))

    def getDeviceClassGraphPoints(self, deviceClass):
        facade = self._getFacade()
        result = facade.getDeviceClassGraphPoints(deviceClass)
        return DirectResponse.succeed(data=result)

    def getDeviceClassGraphDefinition(self, deviceClass, graphPointsUids):
        facade = self._getFacade()
        infos = facade.getDeviceClassGraphDefinition(deviceClass, graphPointsUids)
        result = [Zuul.marshal(info) for info in infos]
        return DirectResponse.succeed(data=result)

    def getNetworks(self):
        facade = self._getFacade()
        result = facade.getNetworks()
        return DirectResponse.succeed(data=Zuul.marshal(result, keys=['uid', 'name']))

    def getNetworkMapData(self, uid, depth):
        facade = self._getFacade()
        result = facade.getNetworkMapData(uid, depth)
        return DirectResponse.succeed(data=Zuul.marshal(result))
