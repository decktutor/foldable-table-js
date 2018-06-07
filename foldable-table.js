(function () {

const addLeaf = (tree, item) => {
  const { path, id } = item;
  // console.log(id);
  let o = tree;
  const lastIndex = path.length - 1;
  $.each(path, (i, token) => {
    if (o[token] === undefined) {
      const prefixPath = path.slice(0, i + 1);
      const id = prefixPath.join('-');
      o[token] = { branches: {}, path: prefixPath, id };
    }
    o = i === lastIndex ? o[token] : o[token].branches;
  });
  Object.assign(o, item);
};

const generateTree = (data) => {
  const tree = { branches: {}, path: [] };
  $.each(data, (i, item) => {
    addLeaf(tree.branches, item);
  });
  return tree;
};

const parsePath = (path) => path.split('-');

const expandPaths = (data) => $.map(data, (item) => {
  item.path = parsePath(item.id);
  return item;
});

const hasBranches = (obj) => Boolean(obj.branches && Object.keys(obj.branches).length > 0);

const createBranch = ({ root, formatters, title }) => {
  const { data, path, url, id } = root;
  const pathStr = path.join('-');

  const $self = $('<div>')
    .addClass('branch')
    .addClass('folded')
    .toggleClass('has-branches', hasBranches(root))

  const $row = $('<div>').addClass('row').appendTo($self);

  const $main = $('<span>')
    .addClass('main')
    .appendTo($row);

  const $fold = $('<a>')
    .addClass('toggle-fold')
    .attr('href', '#fold,' + id)
    .appendTo($main)
    .click(() => {
      $self.toggleClass('folded');
      return false;
    });

  $('<span>').text('-').addClass('fold').appendTo($fold);
  $('<span>').text('+').addClass('unfold').appendTo($fold);

  const idText = id + (hasBranches(root) ? '-*' : '');
  const label = title || (id && idText) || "";
  const $head = $('<a>').attr('href', url).text(label).appendTo($main);

  if (data) {
    const formattedData = $.map(data, (v, i) => {
      const fun = formatters[i];
      return fun ? fun(v) : v;
    });
    const $cells = $.map(formattedData, (content, key) => $('<span>').text(content).addClass('col-' + key).addClass('col'));
    $row.append($cells)
  }

  $.each(root.branches, (key, branch) => {
    createBranch({ root: branch, formatters }).appendTo($self);
  });

  return $self;
};

const renderHeader = (data) => {
  const $row = $('<div>').addClass('header row');
  const $main = $('<span>')
    .addClass('main')
    .appendTo($row);
  if (data) {
    const $cells = $.map(data, (content, key) => $('<span>').text(content).addClass('col-' + key).addClass('col'));
    $row.append($cells)
  }
  return $row;
};

const renderTable = ({ root, formatters, title, header }) => {
  const $self = $('<div>').addClass('foldable-table');
  if (header) {
    renderHeader(header).appendTo($self);
  }
  createBranch({ root, formatters, title }).appendTo($self).removeClass('folded')
  return $self;
};

const fixAnonymousLeaves = (branch) => {
  const { path, branches, data, id, url } = branch;

  if (hasBranches(branch) && data) {
    branches['_'] = { path, id, data, url };
    delete branch.data;
    delete branch.url;
  }

  $.each(branch.branches, (i, b) => fixAnonymousLeaves(b));
  return branch;
};

const addAggregatedData = (branch) => {

  const { path, branches, id } = branch;

  if (hasBranches(branch)) {
    let data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let maxIndex = 0;

    $.each(branches, (i, b) => {
      if (!b.data) {
        addAggregatedData(b);
      }

      $.each(b.data, (i, item) => {
        data[i] += item;
        maxIndex = i > maxIndex ? i : maxIndex;
      });
    });

    branch.data = data.slice(0, maxIndex + 1);
  }

  return branch;
};

$.fn.foldableTable = function ({ data, formatters, header }) {
  return this.each(function () {
    const $this = $(this);
    const title = $this.attr('title');
    const tree = addAggregatedData(fixAnonymousLeaves(generateTree(expandPaths(data))));
    const $table = renderTable({ root: tree, formatters, title, header });
    $this.append($table);
    const controller = {
      expandAll: () => $table.find('.branch').removeClass('folded'),
      collapseAll: () => $table.find('.branch').addClass('folded')
    };
    $this.data('foldableTable', controller);
    return this;
  })
};

}());
