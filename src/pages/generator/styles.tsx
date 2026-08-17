import { styled } from 'goober';
import { Container as BasicContainer } from '@components/styles';

const GeneratorContainer = styled('div')`
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex: 1;
`;

const Password = styled('div')`
  font-size: 2em;
  width: 20ch;
  text-align: center;
`;

const Container = styled('div')`
  flex: 1;
  display: flex;
  flex-direction: column;
  ${BasicContainer}
`;

export { GeneratorContainer, Container, Password };
