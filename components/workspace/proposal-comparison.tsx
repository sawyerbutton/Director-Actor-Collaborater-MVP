'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  approach?: string;
  pros: string[];
  cons: string[];
  dramaticImpact?: string;
}

export interface ProposalComparisonProps {
  proposals: Proposal[];
  onSelect: (proposalId: string, index: number) => void;
  selectedId?: string;
  className?: string;
}

export function ProposalComparison({
  proposals,
  onSelect,
  selectedId,
  className
}: ProposalComparisonProps) {
  if (proposals.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          暂无提案
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {proposals.map((proposal, index) => (
        <Card
          key={proposal.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg',
            selectedId === proposal.id && 'ring-2 ring-blue-500'
          )}
          onClick={() => onSelect(proposal.id, index)}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg">{proposal.title}</CardTitle>
              {proposal.approach && (
                <Badge variant="outline" className="text-xs">
                  {proposal.approach}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">{proposal.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Pros */}
            {proposal.pros.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4" /> 优点
                </h4>
                <ul className="space-y-1">
                  {proposal.pros.map((pro, i) => (
                    <li key={i} className="text-sm text-gray-700 pl-4 relative">
                      <span className="absolute left-0">•</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons */}
            {proposal.cons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-1">
                  <X className="w-4 h-4" /> 缺点
                </h4>
                <ul className="space-y-1">
                  {proposal.cons.map((con, i) => (
                    <li key={i} className="text-sm text-gray-700 pl-4 relative">
                      <span className="absolute left-0">•</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dramatic Impact */}
            {proposal.dramaticImpact && (
              <div className="bg-purple-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-purple-900 mb-1">
                  戏剧效果
                </h4>
                <p className="text-sm text-purple-700">{proposal.dramaticImpact}</p>
              </div>
            )}

            {/* Select button */}
            <Button
              className="w-full mt-4"
              variant={selectedId === proposal.id ? 'default' : 'outline'}
            >
              {selectedId === proposal.id ? '已选择' : '选择此方案'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
