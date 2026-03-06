import "./compute.tsp";
import "./disk.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

/**
 * Compute Client
 */
@client({
    name: "ComputeClient",
    service: [Compute, ComputeDisk],
})
namespace ComputeCombine;


@@clientName(Compute.ActionGroup, "ComputeActionGroup", "javascript");
@@clientName(ComputeDisk.ActionGroup, "ComputeDiskActionGroup", "javascript");

@@clientName(Compute.ActionGroupsProperties, "ComputeActionGroupsProperties", "javascript");
@@clientName(ComputeDisk.ActionGroupsProperties, "ComputeDiskActionGroupsProperties", "javascript");

@@clientName(ComputeDisk.DiskAccess, "ComputeDiskDiskAccess", "javascript");
@@clientName(ComputeDisk.DiskAccessProperties, "ComputeDiskDiskAccessProperties", "javascript");

@@clientName(ComputeDisk.Disk, "ComputeDiskDisk", "javascript");
@@clientName(ComputeDisk.DiskProperties, "ComputeDiskDiskProperties", "javascript");

@@clientName(Compute.RestorePointCollection, "ComputeRestorePointCollection", "javascript");
@@clientName(Compute.RestorePointCollectionProperties, "ComputeRestorePointCollectionProperties", "javascript");

@@clientName(Compute.VirtualMachine, "ComputeVirtualMachine", "javascript");
@@clientName(Compute.VirtualMachineProperties, "ComputeVirtualMachineProperties", "javascript");




