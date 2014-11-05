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
from Products.ZenUtils.Ext import DirectResponse

class DashboardRouter(DirectRouter):
    def _getFacade(self):
        return Zuul.getFacade('dashboard', self.context)


    def getAvailableDashboards(self):
        facade = self._getFacade()
        results = facade.getAvailableDashboards()
        return DirectResponse.succeed(data=Zuul.marshal(results))

    def addDashboard(self, newId, uid, columns):
        facade = self._getFacade()
        result = facade.addDashboard(newId, uid, columns)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def deleteDashboard(self, uid):
        facade = self._getFacade()
        result = facade.deleteObject(uid)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def saveDashboard(self, **data):
        facade = self._getFacade()
        result = facade.saveDashboard(data)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def saveDashboardState(self, uid, state):
        facade = self._getFacade()
        result = facade.saveDashboardState(uid, state)
        return DirectResponse.succeed(data=Zuul.marshal(result))

    def getCurrentUsersGroups(self):
        facade = self._getFacade()
        result = facade.getCurrentUsersGroups()
        return DirectResponse.succeed(data=Zuul.marshal(result))
