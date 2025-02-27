// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import {TeamType} from '@mattermost/types/teams';

import {TestHelper} from 'utils/test_helper';

import NeedsTeam from 'components/needs_team/needs_team';

jest.mock('actions/global_actions', () => ({
    emitCloseRightHandSide: jest.fn(),
}));

jest.mock('actions/post_actions', () => ({
    stopPeriodicStatusUpdates: jest.fn(),
    startPeriodicStatusUpdates: jest.fn(),
    loadStatusesForChannelAndSidebar: jest.fn(),
}));

jest.mock('actions/post_actions', () => ({
    startPeriodicSync: jest.fn(),
    stopPeriodicSync: jest.fn(),
    reconnect: jest.fn(),
}));

jest.mock('utils/utils', () => ({
    localizeMessage: jest.fn(),
    isGuest: jest.fn(),
    makeIsEligibleForClick: jest.fn(),
}));

describe('components/needs_team', () => {
    const history = {
        push: jest.fn(),
    };
    const teamType: TeamType = 'I';
    const teamsList = [TestHelper.getTeamMock({
        id: 'kemjcpu9bi877yegqjs18ndp4r',
        invite_id: 'ojsnudhqzbfzpk6e4n6ip1hwae',
        name: 'test',
        create_at: 123,
        update_at: 123,
        delete_at: 0,
        display_name: 'test',
        description: 'test',
        email: 'test',
        type: teamType,
        company_name: 'test',
        allowed_domains: 'test',
        allow_open_invite: false,
        scheme_id: 'test',
        group_constrained: false,
    })];

    const match = {
        params: {
            team: 'new',
        },
    };

    const teamData = TestHelper.getTeamMock({
        id: 'kemjcpu9bi877yegqjs18ndp4d',
        invite_id: 'kemjcpu9bi877yegqjs18ndp4a',
        name: 'new',
        create_at: 123,
        update_at: 123,
        delete_at: 0,
        display_name: 'test',
        description: 'test',
        email: 'test',
        type: teamType,
        company_name: 'test',
        allowed_domains: 'test',
        allow_open_invite: false,
        scheme_id: 'test',
        group_constrained: false,
    });

    const actions = {
        fetchMyChannelsAndMembersREST: jest.fn().mockResolvedValue({data: true}),
        fetchAllMyTeamsChannelsAndChannelMembersREST: jest.fn().mockResolvedValue({data: true}),
        fetchThreadMentionCountsByChannel: jest.fn().mockResolvedValue({data: true}),
        getMyTeamUnreads: jest.fn(),
        viewChannel: jest.fn(),
        markChannelAsReadOnFocus: jest.fn(),
        getTeamByName: jest.fn().mockResolvedValue({data: teamData}),
        addUserToTeam: jest.fn().mockResolvedValue({data: true}),
        selectTeam: jest.fn(),
        setPreviousTeamId: jest.fn(),
        loadStatusesForChannelAndSidebar: jest.fn().mockResolvedValue({data: true}),
        getAllGroupsAssociatedToChannelsInTeam: jest.fn().mockResolvedValue({data: true}),
        getAllGroupsAssociatedToTeam: jest.fn().mockResolvedValue({data: true}),
        getGroups: jest.fn().mockResolvedValue({data: true}),
        getGroupsByUserIdPaginated: jest.fn().mockResolvedValue({data: true}),
    };
    const baseProps = {
        license: {},
        actions,
        currentUser: TestHelper.getUserMock({
            id: 'test',
        }),
        mfaRequired: false,
        match,
        teamsList,
        history,
        previousTeamId: '',
        selectedThreadId: null,
        collapsedThreads: true,
        shouldShowAppBar: true,
        adminSetupRequired: false,
        isUserFirstAdmin: false,
        isCustomGroupsEnabled: false,
    };
    it('should match snapshots for init with existing team', () => {
        const fetchMyChannelsAndMembersREST = jest.fn().mockResolvedValue({data: true});

        const existingTeamMatch = {
            params: {
                team: 'test',
            },
        };

        const newActions = {...baseProps.actions, fetchMyChannelsAndMembersREST};
        const props = {...baseProps, actions: newActions, match: existingTeamMatch};

        const wrapper = shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );
        expect(wrapper).toMatchSnapshot();
        fetchMyChannelsAndMembersREST().then(() => {
            expect(wrapper.state().finishedFetchingChannels).toEqual(true);
            expect(wrapper).toMatchSnapshot();
        });
    });

    it('check for addUserToTeam call if team does not exist', async () => {
        const addUserToTeam = jest.fn().mockResolvedValue({data: true});
        const newActions = {...baseProps.actions, addUserToTeam};
        const props = {...baseProps, actions: newActions};

        const wrapper = shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );
        expect(wrapper.state().team).toEqual(null);
        await wrapper.instance().joinTeam(props);
        expect(addUserToTeam).toHaveBeenCalledTimes(2); // called twice, first on initial mount and then on instance().joinTeam()
    });

    it('test for redirection if addUserToTeam api fails', async () => {
        const addUserToTeam = jest.fn().mockResolvedValue({error: {}});
        const newActions = {...baseProps.actions, addUserToTeam};
        const props = {...baseProps, actions: newActions};

        const wrapper = shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );

        expect(wrapper.state().team).toEqual(null);
        await wrapper.instance().joinTeam(props);
        expect(history.push).toBeCalledWith('/error?type=team_not_found');
    });

    it('test for redirection if the retrieved team is deleted', async () => {
        const addUserToTeam = jest.fn().mockResolvedValue({data: true});
        const getTeamByName = jest.fn().mockResolvedValue({data: {...teamData, delete_at: 1}});
        const newActions = {...baseProps.actions, addUserToTeam, getTeamByName};
        const props = {...baseProps, actions: newActions};

        const wrapper = shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );

        expect(wrapper.state().team).toEqual(null);
        await wrapper.instance().joinTeam(props);
        expect(history.push).toBeCalledWith('/error?type=team_not_found');
    });

    it('test for team join flow with new switch', async () => {
        const addUserToTeam = jest.fn().mockResolvedValue({data: 'horray'});

        const getMyTeamUnreads = jest.fn();
        const selectTeam = jest.fn();
        const setPreviousTeamId = jest.fn();

        const newActions = {...baseProps.actions, getMyTeamUnreads, addUserToTeam, selectTeam, setPreviousTeamId};
        const props = {...baseProps, actions: newActions};

        const wrapper = shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );

        expect(wrapper.state().team).toEqual(null);
        await wrapper.instance().joinTeam(props);

        expect(wrapper.state().team!.name).toEqual('new');
        expect(selectTeam).toBeCalledWith(wrapper.state().team);
        expect(getMyTeamUnreads).toHaveBeenCalledTimes(2); // called twice, first on initial mount and then on instance().joinTeam()
        expect(setPreviousTeamId).toBeCalledWith(wrapper.state().team!.id);

        const existingTeamMatch = {
            params: {
                team: 'test',
            },
        };

        // team change and team exists
        wrapper.setProps({match: existingTeamMatch});
        wrapper.update();

        const newTeamMatch = {
            params: {
                team: 'test1',
            },
        };

        wrapper.setProps({match: newTeamMatch});
        wrapper.update();
        expect(wrapper.state().team).toEqual(null);
    });

    it('check for getGroupsByUserIdPaginated call if isCustomGroupsEnabled is true', async () => {
        const fetchMyChannelsAndMembers = jest.fn().mockResolvedValue({data: true});

        const existingTeamMatch = {
            params: {
                team: 'test',
            },
        };

        const getGroupsByUserIdPaginated = jest.fn().mockResolvedValue({data: true});
        const newActions = {...baseProps.actions, getGroupsByUserIdPaginated, fetchMyChannelsAndMembers};
        const props = {
            ...baseProps,
            license: {
                IsLicensed: 'true',
            },
            isCustomGroupsEnabled: true,
            actions: newActions,
            match: existingTeamMatch,
        };

        shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );
        expect(getGroupsByUserIdPaginated).toHaveBeenCalledTimes(1);
    });

    it('check for absence of getGroupsByUserIdPaginated call if isCustomGroupsEnabled is false', async () => {
        const fetchMyChannelsAndMembers = jest.fn().mockResolvedValue({data: true});

        const existingTeamMatch = {
            params: {
                team: 'test',
            },
        };

        const getGroupsByUserIdPaginated = jest.fn().mockResolvedValue({data: true});
        const newActions = {...baseProps.actions, getGroupsByUserIdPaginated, fetchMyChannelsAndMembers};
        const props = {
            ...baseProps,
            license: {
                IsLicensed: 'true',
            },
            actions: newActions,
            match: existingTeamMatch,
        };

        shallow<NeedsTeam>(
            <NeedsTeam {...props}/>,
        );
        expect(getGroupsByUserIdPaginated).toHaveBeenCalledTimes(0);
    });
});
