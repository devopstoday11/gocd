/*
 * Copyright 2020 ThoughtWorks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {timeFormatter} from "helpers/time_formatter";
import {stringOrUndefined} from "models/compare/pipeline_instance_json";
import {MaterialModification} from "models/config_repos/types";
import {MaterialModifications, MaterialWithFingerprint} from "models/materials/materials";
import {ModalState} from "views/components/modal";
import {TestHelper} from "views/pages/spec/test_helper";
import styles from "../index.scss";
import {ApiService, ShowModificationsModal} from "../modal";
import {git} from "./materials_widget_spec";

describe('ShowModificationsModalSpec', () => {
  const helper = new TestHelper();
  let material: MaterialWithFingerprint;
  let modal: ShowModificationsModal;
  let materialMods: MaterialModifications;

  beforeEach(() => {
    material     = MaterialWithFingerprint.fromJSON(git());
    materialMods = new MaterialModifications();
  });
  afterEach((done) => helper.unmount(done));

  function mount() {
    modal = new ShowModificationsModal(material, new DummyService(materialMods));
    helper.mount(modal.view.bind(modal));
  }

  it('should render title', () => {
    mount();
    expect(modal.title()).toBe("Show Modifications for 'some-name'");
  });

  it('should render title as attribute if name is not provided', () => {
    material.attributes().name(undefined);
    mount();

    expect(modal.title()).toBe("Show Modifications for 'git@github.com:sample_repo/example.git [ master ]'");
  });

  it('should show a spinner and search box if modal state is loading', () => {
    mount();
    modal.modalState = ModalState.LOADING;
    helper.redraw();

    expect(helper.byTestId("spinner")).toBeInDOM();
    expect(helper.byTestId("search-box")).toBeInDOM();
    expect(helper.byTestId("modifications-modal")).not.toBeInDOM();
  });

  it('should show a flash message with a msg if any', () => {
    mount();
    modal.errorMessage("Some error has occurred!!!");
    helper.redraw();

    expect(helper.byTestId("flash-message-alert")).toBeInDOM();
    expect(helper.textByTestId("flash-message-alert")).toEqual("Some error has occurred!!!");
    expect(helper.byTestId("modifications-modal")).not.toBeInDOM();
  });

  it('should render modifications with vsm link', () => {
    materialMods.push(new MaterialModification("GoCD Test User <devnull@example.com>", null, "b9b4f4b758e91117d70121a365ba0f8e37f89a9d", "Initial commit", "2019-12-23T10:25:52Z"));
    mount();

    expect(helper.byTestId("modifications-modal")).toBeInDOM();
    expect(helper.byTestId('modification-0')).toBeInDOM();

    expect(helper.byTestId('modification-comment').textContent).toBe('Initial commit');

    const committerInfo = helper.byTestId('committer-info');
    expect(committerInfo.textContent).toBe(`By GoCD Test User <devnull@example.com> on ${timeFormatter.format("2019-12-23T10:25:52Z")} | b9b4f4b758e91117d70121a365ba0f8e37f89a9d | VSM`);

    expect(helper.byTestId("vsm-link", committerInfo)).toBeInDOM();
    expect(helper.byTestId("vsm-link", committerInfo)).toHaveAttr('href', '/go/materials/value_stream_map/some-fingerprint/b9b4f4b758e91117d70121a365ba0f8e37f89a9d');
    expect(helper.byTestId("vsm-link", committerInfo)).toHaveAttr('title', 'Value Stream Map');
  });

  it('should have enabled next and previous buttons if both links are available', () => {
    materialMods.nextLink     = "some-link";
    materialMods.previousLink = "some-other-link";
    mount();

    const pageDiv = helper.byTestId("pagination");
    expect(pageDiv).toBeInDOM();
    expect(helper.q("a[title='Previous']", pageDiv)).not.toHaveClass(styles.disabled);
    expect(helper.q("a[title='Next']", pageDiv)).not.toHaveClass(styles.disabled);
  });

  it('should disabled previous button if no link is present', () => {
    materialMods.nextLink = "some-link";
    mount();

    const pageDiv = helper.byTestId("pagination");
    expect(pageDiv).toBeInDOM();
    expect(helper.q("a[title='Previous']", pageDiv)).toHaveClass(styles.disabled);
    expect(helper.q("a[title='Next']", pageDiv)).not.toHaveClass(styles.disabled);
  });

  it('should disabled next button if no link is present', () => {
    materialMods.previousLink = "some-link";
    mount();

    const pageDiv = helper.byTestId("pagination");
    expect(pageDiv).toBeInDOM();
    expect(helper.q("a[title='Previous']", pageDiv)).not.toHaveClass(styles.disabled);
    expect(helper.q("a[title='Next']", pageDiv)).toHaveClass(styles.disabled);
  });

  it('should send a service call on click of next or previous link with the corresponding link', () => {
    const spy                 = jasmine.createSpy("test");
    materialMods.nextLink     = "some-link";
    materialMods.previousLink = "some-other-link";
    materialMods.push(new MaterialModification("GoCD Test User <devnull@example.com>", null, "b9b4f4b758e91117d70121a365ba0f8e37f89a9d", "Initial commit", "2019-12-23T10:25:52Z"));

    const service: ApiService = new class implements ApiService {
      fetchHistory(fingerprint: string, searchPattern: string, link: stringOrUndefined, onSuccess: (data: MaterialModifications) => void, onError: (message: string) => void): void {
        onSuccess(materialMods);
        spy(fingerprint, link);
      }
    }();
    modal                     = new ShowModificationsModal(material, service);
    helper.mount(modal.view.bind(modal));

    const pageDiv = helper.byTestId("pagination");

    helper.click(helper.q("a[title='Previous']", pageDiv));
    expect(spy.calls.mostRecent().args).toEqual([material.fingerprint(), "some-other-link"]);

    helper.click(helper.q("a[title='Next']", pageDiv));
    expect(spy.calls.mostRecent().args).toEqual([material.fingerprint(), "some-link"]);
  });

  it('should truncate comment if it exceeds the limit', () => {
    materialMods.push(new MaterialModification("GoCD Test User <devnull@example.com>", null, "b9b4f4b758e91117d70121a365ba0f8e37f89a9d", "A very long comment to be shown as part of the panel body which should be trimmed and rest part should not be shown by default. ", "2019-12-23T10:25:52Z"));
    mount();

    expect(helper.textByTestId('modification-comment')).toBe('A very long comment to be shown as part of the panel body which should be trimme...more');
    helper.clickByTestId("ellipse-action-more");

    expect(helper.textByTestId('modification-comment')).toBe('A very long comment to be shown as part of the panel body which should be trimmed and rest part should not be shown by default. less');
  });

  it('should render the first line in modification comment as truncated text', () => {
    materialMods.push(new MaterialModification("GoCD Test User <devnull@example.com>", null, "b9b4f4b758e91117d70121a365ba0f8e37f89a9d", "A very long comment to be shown as part of the panel body.\n Which should be trimmed and rest part should not be shown by default.", "2019-12-23T10:25:52Z"));
    mount();

    expect(helper.textByTestId('modification-comment')).toBe('A very long comment to be shown as part of the panel body....more');
    helper.clickByTestId("ellipse-action-more");

    expect(helper.textByTestId('modification-comment')).toBe('A very long comment to be shown as part of the panel body.\n Which should be trimmed and rest part should not be shown by default.less');
  });
});

class DummyService implements ApiService {
  materialMods: MaterialModifications;

  constructor(materialMods: MaterialModifications) {
    this.materialMods = materialMods;
  }

  fetchHistory(fingerprint: string, searchPatter: string, link: stringOrUndefined, onSuccess: (data: MaterialModifications) => void, onError: (message: string) => void): void {
    onSuccess(this.materialMods);
  }
}
