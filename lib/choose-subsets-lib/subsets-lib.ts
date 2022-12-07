const SUBGROUP_TO_BIG_ERROR = "Groups can ony have subgroups whose size is smaller or equal to original group's size";

function chooseCandidate(votes: number[], groupSize: number) {
  if (votes.length < groupSize) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }
}

export function getSubsetsOfSizeSlow(array: any[], size: number) {
  if (array.length < size) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }

  const result = [];

  function helper(arr: any[], splitIndex: number) {
    if (arr.length === size) {
      result.push(arr);
      return;
    }
    if (splitIndex + 1 > array.length) {
      return;
    }
    // Old idea comment
    helper(arr.concat(array[splitIndex]), splitIndex + 1);
    helper(arr, splitIndex + 1);
  }

  helper([], 0);
  return result;
}

export function getSubsetsOfSize(array: any[], size: number) {
  if (array.length < size) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }

  const result = [];

  function helper(arr: any[], splitIndex: number) {
    if (arr.length === size) {
      result.push(arr);
      return;
    }
    if (splitIndex + 1 > array.length) {
      return;
    }
    // We only want to explore the "tree" if we can find sufficient size elements down there
    const subtreeSizes = arr.length + array.length - splitIndex;
    if (subtreeSizes >= size) {
      helper(arr.concat(array[splitIndex]), splitIndex + 1);
      if (subtreeSizes > size) {
        helper(arr, splitIndex + 1);
      }
    }
  }

  helper([], 0);
  return result;
}